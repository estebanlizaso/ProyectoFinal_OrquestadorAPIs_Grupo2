using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Contexts;

namespace OrquestadorApi.Services.Architecture;

public class ArchitectureService : IArchitectureService
{
    private static readonly Regex EnvNamePattern =
        new("^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.Compiled);

    private readonly AppDbContext _dbContext;
    private readonly IAiProvider _aiProvider;
    private readonly OrchestrationOptions _options;
    private readonly ILogger<ArchitectureService> _logger;

    public ArchitectureService(
        AppDbContext dbContext,
        IAiProvider aiProvider,
        IOptions<OrchestrationOptions> options,
        ILogger<ArchitectureService> logger)
    {
        _dbContext = dbContext;
        _aiProvider = aiProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GenerateArchitectureResult> GenerateAsync(
        int projectId,
        string? language,
        CancellationToken cancellationToken = default)
    {
        var projectContext = await _dbContext.Contexts
            .AsNoTracking()
            .SingleOrDefaultAsync(context => context.ProjectId == projectId, cancellationToken);

        if (projectContext is null)
        {
            return new GenerateArchitectureResult(GenerateArchitectureStatus.NotFound);
        }

        var nodes = await _dbContext.OrchestrationNodes
            .AsNoTracking()
            .Where(node => node.ContextId == projectContext.ContextId && node.IsActive)
            .OrderBy(node => node.SortOrder)
            .ThenBy(node => node.Key)
            .ToListAsync(cancellationToken);

        var relations = await _dbContext.OrchestrationRelations
            .AsNoTracking()
            .Where(relation => relation.ContextId == projectContext.ContextId)
            .OrderBy(relation => relation.SortOrder)
            .ThenBy(relation => relation.RelationId)
            .ToListAsync(cancellationToken);

        var systemNodes = nodes
            .Where(node => string.Equals(node.Kind, "system", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (systemNodes.Count == 0)
        {
            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.NoDetectedContexts,
                Message: "El proyecto todavía no tiene contextos de tipo system. " +
                    "Iterá con el planificador antes de generar la arquitectura.");
        }

        if (nodes.Count > _options.MaxNodes)
        {
            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.LimitExceeded,
                Message: $"El mapa actual tiene {nodes.Count} nodos y el máximo es {_options.MaxNodes}.");
        }

        if (relations.Count > _options.MaxRelations)
        {
            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.LimitExceeded,
                Message: $"El mapa actual tiene {relations.Count} relaciones y el máximo es {_options.MaxRelations}.");
        }

        if (systemNodes.Count > _options.MaxSystemContexts)
        {
            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.TooManyContexts,
                Message: $"El MVP permite generar hasta {_options.MaxSystemContexts} contextos system. " +
                    $"El mapa actual tiene {systemNodes.Count}.");
        }

        var selectedLanguage = ResolveLanguage(language, projectContext.Language);

        if (selectedLanguage is null)
        {
            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.InvalidLanguage,
                Message: "El lenguaje debe ser 'python' o 'dotnet'.");
        }

        var keysById = nodes.ToDictionary(node => node.NodeId, node => node.Key);

        var agentInput = JsonSerializer.Serialize(
            new
            {
                initialPrompt = projectContext.InitialPrompt,
                resumen = projectContext.Resumen,
                language = selectedLanguage,
                plan = projectContext.PlannerPlan ?? [],
                assumptions = projectContext.PlannerAssumptions ?? [],
                requiredContextKeys = systemNodes.Select(node => node.Key).ToList(),
                nodes = nodes.Select(node => new
                {
                    key = node.Key,
                    name = node.Name,
                    description = node.Description,
                    kind = node.Kind,
                    role = node.Role,
                    responsibility = node.Responsibility,
                    status = node.Status,
                    userNotes = node.UserNotes
                }),
                relations = relations
                    .Where(relation =>
                        keysById.ContainsKey(relation.SourceNodeId) &&
                        keysById.ContainsKey(relation.TargetNodeId))
                    .Select(relation => new
                    {
                        from = keysById[relation.SourceNodeId],
                        to = keysById[relation.TargetNodeId],
                        label = relation.Label,
                        operation = relation.Operation,
                        description = relation.Description,
                        kind = relation.Kind
                    })
            },
            JsonSerializerOptions.Web);

        try
        {
            var response = await _aiProvider.GenerateArchitectureAsync(
                agentInput,
                cancellationToken);

            var responseLanguage = PlannerResponseNormalizer.NormalizeLanguage(response.Language);

            if (responseLanguage != selectedLanguage)
            {
                throw new AiProviderException(
                    $"Gemini devolvió el lenguaje '{response.Language}' en lugar de '{selectedLanguage}'.");
            }

            var systemByKey = systemNodes.ToDictionary(
                node => node.Key,
                node => node,
                StringComparer.Ordinal);
            var seenKeys = new HashSet<string>(StringComparer.Ordinal);
            var contextResponses = new List<ArchitectureContextResponse>();
            var envLines = new List<string>();
            var envNames = new HashSet<string>(StringComparer.Ordinal);
            var totalLines = 0;

            foreach (var block in response.Contexts)
            {
                if (block is null)
                {
                    throw new AiProviderException(
                        "Gemini devolvió un bloque de arquitectura nulo.");
                }

                var key = PlannerResponseNormalizer.Slugify(block.Key);

                if (!systemByKey.TryGetValue(key, out var node))
                {
                    throw new AiProviderException(
                        $"Gemini devolvió código para el contexto desconocido '{block.Key}'.");
                }

                if (!seenKeys.Add(key))
                {
                    throw new AiProviderException(
                        $"Gemini devolvió más de un bloque para el contexto '{key}'.");
                }

                var code = NormalizeCode(block.Code);

                if (string.IsNullOrWhiteSpace(code))
                {
                    throw new AiProviderException(
                        $"Gemini devolvió código vacío para el contexto '{key}'.");
                }

                var lines = CountLines(code);

                if (lines > _options.MaxCodeLinesPerContext)
                {
                    return new GenerateArchitectureResult(
                        GenerateArchitectureStatus.LimitExceeded,
                        Message: $"El código del contexto '{key}' tiene {lines} líneas y el máximo es " +
                            $"{_options.MaxCodeLinesPerContext}.");
                }

                totalLines += lines;

                var env = new List<ArchitectureEnvVarResponse>();

                foreach (var envVar in block.Env ?? [])
                {
                    if (envVar is null || string.IsNullOrWhiteSpace(envVar.Name))
                    {
                        continue;
                    }

                    var name = envVar.Name.Trim();

                    if (!EnvNamePattern.IsMatch(name))
                    {
                        throw new AiProviderException(
                            $"Gemini devolvió el nombre de variable de entorno inválido '{name}'.");
                    }

                    env.Add(new ArchitectureEnvVarResponse(
                        name,
                        TrimToNull(envVar.Example),
                        TrimToNull(envVar.Description)));

                    if (envNames.Add(name))
                    {
                        envLines.Add($"{name}={envVar.Example?.Trim() ?? string.Empty}");
                    }
                }

                contextResponses.Add(new ArchitectureContextResponse(
                    key,
                    node.Name,
                    string.IsNullOrWhiteSpace(block.Summary)
                        ? $"Código de integración para {node.Name}."
                        : block.Summary.Trim(),
                    code,
                    NormalizeStrings(block.Dependencies),
                    env,
                    NormalizeStrings(block.Assumptions),
                    NormalizeStrings(block.Warnings)));
            }

            var missingKeys = systemNodes
                .Where(node => !seenKeys.Contains(node.Key))
                .Select(node => node.Key)
                .ToList();

            if (missingKeys.Count > 0)
            {
                throw new AiProviderException(
                    "Gemini no devolvió código para los contextos: " +
                    $"{string.Join(", ", missingKeys)}. " +
                    "La respuesta debe incluir un bloque por cada nodo system activo.");
            }

            if (totalLines > _options.MaxTotalCodeLines)
            {
                return new GenerateArchitectureResult(
                    GenerateArchitectureStatus.LimitExceeded,
                    Message: $"El código generado tiene {totalLines} líneas y el máximo total es " +
                        $"{_options.MaxTotalCodeLines}.");
            }

            var currentMapVersion = await _dbContext.Contexts
                .AsNoTracking()
                .Where(context => context.ContextId == projectContext.ContextId)
                .Select(context => context.MapVersion)
                .SingleOrDefaultAsync(cancellationToken);

            var contextChanged = currentMapVersion != projectContext.MapVersion;
            var warnings = new List<string>();

            if (contextChanged)
            {
                warnings.Add(
                    "El mapa de orquestación cambió durante la generación. " +
                    "Revisá el resultado o generá la arquitectura nuevamente.");
            }

            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.Success,
                new ArchitectureResponse(
                    projectContext.ContextId,
                    projectContext.ProjectId,
                    selectedLanguage,
                    projectContext.MapVersion,
                    DateTime.UtcNow,
                    response.Summary.Trim(),
                    envLines.Count > 0 ? string.Join(Environment.NewLine, envLines) : null,
                    contextResponses,
                    warnings,
                    contextChanged));
        }
        catch (AiProviderException exception)
        {
            _logger.LogError(
                exception,
                "No se pudo generar la arquitectura del contexto {ContextId} del proyecto {ProjectId}.",
                projectContext.ContextId,
                projectContext.ProjectId);

            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.AiProviderFailed,
                Message: exception.Message);
        }
    }

    private static string? ResolveLanguage(string? languageOverride, string? storedLanguage)
    {
        if (!string.IsNullOrWhiteSpace(languageOverride))
        {
            try
            {
                return PlannerResponseNormalizer.NormalizeLanguage(languageOverride);
            }
            catch (AiProviderException)
            {
                return null;
            }
        }

        return TryNormalizeLanguage(storedLanguage) ?? "python";
    }

    private static string? TryNormalizeLanguage(string? value)
    {
        try
        {
            return PlannerResponseNormalizer.NormalizeLanguage(value);
        }
        catch (AiProviderException)
        {
            return null;
        }
    }

    private static string NormalizeCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return string.Empty;
        }

        var normalized = code.Trim();

        if (normalized.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = normalized.IndexOf('\n');
            if (firstNewLine >= 0)
            {
                normalized = normalized[(firstNewLine + 1)..];
            }
        }

        if (normalized.EndsWith("```", StringComparison.Ordinal))
        {
            normalized = normalized[..^3];
        }

        return normalized.Trim();
    }

    private static int CountLines(string code)
    {
        var normalized = code.Replace("\r\n", "\n").TrimEnd('\n');
        return normalized.Length == 0 ? 0 : normalized.Split('\n').Length;
    }

    private static IReadOnlyList<string> NormalizeStrings(IReadOnlyList<string>? values)
    {
        if (values is null)
        {
            return [];
        }

        var result = new List<string>(values.Count);
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var value in values)
        {
            var normalized = value?.Trim();

            if (string.IsNullOrWhiteSpace(normalized) || !seen.Add(normalized))
            {
                continue;
            }

            result.Add(normalized);
        }

        return result;
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
