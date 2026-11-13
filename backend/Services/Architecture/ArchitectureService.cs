using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Contexts;
using OrquestadorApi.Services.Drive;

namespace OrquestadorApi.Services.Architecture;

public class ArchitectureService : IArchitectureService
{
    private const string ZipMimeType = "application/zip";

    private static readonly Regex EnvNamePattern =
        new("^[A-Za-z_][A-Za-z0-9_]*$", RegexOptions.Compiled);

    private readonly AppDbContext _dbContext;
    private readonly IAiProvider _aiProvider;
    private readonly IArchitecturePackageBuilder _packageBuilder;
    private readonly IPostmanCollectionBuilder _postmanCollectionBuilder;
    private readonly IDriveStorage _driveStorage;
    private readonly OrchestrationOptions _options;
    private readonly ILogger<ArchitectureService> _logger;

    public ArchitectureService(
        AppDbContext dbContext,
        IAiProvider aiProvider,
        IArchitecturePackageBuilder packageBuilder,
        IPostmanCollectionBuilder postmanCollectionBuilder,
        IDriveStorage driveStorage,
        IOptions<OrchestrationOptions> options,
        ILogger<ArchitectureService> logger)
    {
        _dbContext = dbContext;
        _aiProvider = aiProvider;
        _packageBuilder = packageBuilder;
        _postmanCollectionBuilder = postmanCollectionBuilder;
        _driveStorage = driveStorage;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GenerateArchitectureResult> GenerateAsync(
        int projectId,
        string? language,
        CancellationToken cancellationToken = default)
    {
        var project = await _dbContext.Projects
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.ProjectId == projectId, cancellationToken);

        if (project is null)
        {
            return new GenerateArchitectureResult(GenerateArchitectureStatus.NotFound);
        }

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
                        operation = relation.EffectiveOperation,
                        httpMethod = relation.HttpMethod,
                        path = relation.Path,
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

            var map = ProjectContextMapper.ToResponse(projectContext, nodes, relations);
            var architecture = new ArchitectureResponse(
                projectContext.ContextId,
                projectContext.ProjectId,
                selectedLanguage,
                projectContext.MapVersion,
                DateTime.UtcNow,
                response.Summary.Trim(),
                envLines.Count > 0 ? string.Join(Environment.NewLine, envLines) : null,
                contextResponses,
                warnings,
                contextChanged);

            var postmanCollection = _postmanCollectionBuilder.Build(
                project.ProjectName,
                architecture,
                map.Nodes,
                map.Relations);

            architecture = architecture with { PostmanCollection = postmanCollection };

            if (!_driveStorage.IsEnabled)
            {
                return new GenerateArchitectureResult(
                    GenerateArchitectureStatus.DriveDisabled,
                    Message: "Google Drive no está configurado.");
            }

            var driveUpload = await TryUploadArchitecturePackageAsync(
                project.ProjectName,
                architecture,
                map.Nodes,
                map.Relations,
                warnings,
                cancellationToken);

            if (driveUpload.Drive is null)
            {
                return new GenerateArchitectureResult(
                    GenerateArchitectureStatus.DriveFailed,
                    Message: driveUpload.ErrorMessage ??
                        (warnings.Count > 0
                            ? warnings[^1]
                            : "No se pudo subir el paquete a Google Drive."));
            }

            return new GenerateArchitectureResult(
                GenerateArchitectureStatus.Success,
                architecture with
                {
                    Warnings = warnings,
                    Drive = driveUpload.Drive,
                    PostmanCollection = postmanCollection,
                    GoToDrive = driveUpload.Drive.FolderWebViewLink,
                    DownloadFile = $"/api/projects/{projectId}/architecture/package",
                    DownloadPostmanCollection =
                        $"/api/projects/{projectId}/architecture/postman-collection"
                });
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

    public async Task<DownloadArchitectureArtifactResult> DownloadPackageAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        if (!await ProjectExistsAsync(projectId, cancellationToken))
        {
            return new DownloadArchitectureArtifactResult(DownloadArchitectureStatus.NotFound);
        }

        if (!_driveStorage.IsEnabled)
        {
            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.DriveDisabled,
                Message: "Google Drive no está configurado.");
        }

        try
        {
            var folder = await ResolveProjectFolderAsync(projectId, cancellationToken);
            if (folder is null)
            {
                return new DownloadArchitectureArtifactResult(
                    DownloadArchitectureStatus.NotFound,
                    Message: "Todavía no hay un paquete de arquitectura subido para este proyecto.");
            }

            var zipName = _packageBuilder.BuildFileName();
            var download = await _driveStorage.DownloadFileByNameAsync(
                zipName,
                folder.FolderId,
                cancellationToken);

            if (download is null)
            {
                return new DownloadArchitectureArtifactResult(
                    DownloadArchitectureStatus.NotFound,
                    Message: "No se encontró el ZIP de arquitectura en Google Drive.");
            }

            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.Success,
                download.FileName,
                ZipMimeType,
                download.Content);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "No se pudo descargar el ZIP de arquitectura del proyecto {ProjectId}.",
                projectId);

            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.DriveFailed,
                Message: "No se pudo descargar el ZIP desde Google Drive.");
        }
    }

    public async Task<DownloadArchitectureArtifactResult> DownloadPostmanCollectionAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        if (!await ProjectExistsAsync(projectId, cancellationToken))
        {
            return new DownloadArchitectureArtifactResult(DownloadArchitectureStatus.NotFound);
        }

        if (!_driveStorage.IsEnabled)
        {
            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.DriveDisabled,
                Message: "Google Drive no está configurado.");
        }

        try
        {
            var folder = await ResolveProjectFolderAsync(projectId, cancellationToken);
            if (folder is null)
            {
                return new DownloadArchitectureArtifactResult(
                    DownloadArchitectureStatus.NotFound,
                    Message: "Todavía no hay un paquete de arquitectura subido para este proyecto.");
            }

            var fileName = _postmanCollectionBuilder.BuildFileName();
            var download = await _driveStorage.DownloadFileByNameAsync(
                fileName,
                folder.FolderId,
                cancellationToken);

            if (download is null)
            {
                return new DownloadArchitectureArtifactResult(
                    DownloadArchitectureStatus.NotFound,
                    Message: "No se encontró la collection de Postman en Google Drive.");
            }

            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.Success,
                download.FileName,
                "application/json",
                download.Content);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "No se pudo descargar la collection de Postman del proyecto {ProjectId}.",
                projectId);

            return new DownloadArchitectureArtifactResult(
                DownloadArchitectureStatus.DriveFailed,
                Message: "No se pudo descargar la collection de Postman desde Google Drive.");
        }
    }

    private async Task<ArchitectureDriveUploadResult> TryUploadArchitecturePackageAsync(
        string projectName,
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations,
        List<string> warnings,
        CancellationToken cancellationToken)
    {
        try
        {
            var folderName = _packageBuilder.BuildProjectFolderName(projectName);
            var folder = await _driveStorage.GetOrCreateFolderAsync(
                folderName,
                parentFolderId: null,
                cancellationToken);

            if (!folder.Succeeded || folder.FolderId is null)
            {
                var message =
                    "No se pudo preparar la carpeta en Google Drive" +
                    (string.IsNullOrWhiteSpace(folder.ErrorMessage)
                        ? "."
                        : $": {folder.ErrorMessage}");
                warnings.Add(message);
                return new ArchitectureDriveUploadResult(null, message);
            }

            var zipFileName = _packageBuilder.BuildFileName();
            var zipBytes = _packageBuilder.BuildZip(
                architecture,
                nodes,
                relations,
                architecture.PostmanCollection);
            await using var zipStream = new MemoryStream(zipBytes);
            var zipUpload = await _driveStorage.UploadOrReplaceFileAsync(
                zipFileName,
                ZipMimeType,
                zipStream,
                folder.FolderId,
                cancellationToken);

            if (!zipUpload.Succeeded || zipUpload.FileId is null)
            {
                var message =
                    "No se pudo subir el ZIP a Google Drive" +
                    (string.IsNullOrWhiteSpace(zipUpload.ErrorMessage)
                        ? "."
                        : $": {zipUpload.ErrorMessage}");
                warnings.Add(message);
                return new ArchitectureDriveUploadResult(null, message);
            }

            if (architecture.PostmanCollection is { } postmanCollection &&
                postmanCollection.ValueKind is not JsonValueKind.Undefined and not JsonValueKind.Null)
            {
                var postmanBytes = Encoding.UTF8.GetBytes(postmanCollection.GetRawText());
                await using var postmanStream = new MemoryStream(postmanBytes);
                var postmanUpload = await _driveStorage.UploadOrReplaceFileAsync(
                    _postmanCollectionBuilder.BuildFileName(),
                    "application/json",
                    postmanStream,
                    folder.FolderId,
                    cancellationToken);

                if (!postmanUpload.Succeeded)
                {
                    var message =
                        "No se pudo subir la collection de Postman a Google Drive" +
                        (string.IsNullOrWhiteSpace(postmanUpload.ErrorMessage)
                            ? "."
                            : $": {postmanUpload.ErrorMessage}");
                    warnings.Add(message);
                    return new ArchitectureDriveUploadResult(null, message);
                }
            }

            var sourceMimeType = _packageBuilder.ResolveSourceMimeType(architecture.Language);

            foreach (var context in architecture.Contexts)
            {
                var sourceFileName = _packageBuilder.BuildSourceFileName(
                    context.Key,
                    architecture.Language);
                var sourceBytes = Encoding.UTF8.GetBytes(NormalizeNewLines(context.Code));
                await using var sourceStream = new MemoryStream(sourceBytes);
                var sourceUpload = await _driveStorage.UploadOrReplaceFileAsync(
                    sourceFileName,
                    sourceMimeType,
                    sourceStream,
                    folder.FolderId,
                    cancellationToken);

                if (!sourceUpload.Succeeded)
                {
                    var message =
                        $"No se pudo subir el código del nodo '{context.Key}' a Google Drive" +
                        (string.IsNullOrWhiteSpace(sourceUpload.ErrorMessage)
                            ? "."
                            : $": {sourceUpload.ErrorMessage}");
                    warnings.Add(message);
                    return new ArchitectureDriveUploadResult(null, message);
                }
            }

            return new ArchitectureDriveUploadResult(
                new ArchitectureDriveArtifactResponse(
                    zipUpload.FileName,
                    zipUpload.FileId,
                    zipUpload.WebViewLink,
                    folder.FolderId,
                    folder.FolderName,
                    folder.WebViewLink));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                exception,
                "Error inesperado al empaquetar o subir la arquitectura del proyecto {ProjectId}.",
                architecture.ProjectId);

            const string message = "No se pudo subir el paquete a Google Drive.";
            warnings.Add(message);
            return new ArchitectureDriveUploadResult(null, message);
        }
    }

    private sealed record ArchitectureDriveUploadResult(
        ArchitectureDriveArtifactResponse? Drive,
        string? ErrorMessage = null);

    private async Task<bool> ProjectExistsAsync(int projectId, CancellationToken cancellationToken)
    {
        return await _dbContext.Contexts
            .AsNoTracking()
            .AnyAsync(context => context.ProjectId == projectId, cancellationToken);
    }

    private async Task<DriveFolderResult?> ResolveProjectFolderAsync(
        int projectId,
        CancellationToken cancellationToken)
    {
        var projectName = await _dbContext.Projects
            .AsNoTracking()
            .Where(project => project.ProjectId == projectId)
            .Select(project => project.ProjectName)
            .SingleOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(projectName))
        {
            return null;
        }

        var folderName = _packageBuilder.BuildProjectFolderName(projectName);
        var folder = await _driveStorage.FindFolderAsync(
            folderName,
            parentFolderId: null,
            cancellationToken);

        if (folder is null || !folder.Succeeded || folder.FolderId is null)
        {
            return null;
        }

        return folder;
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

    private static string NormalizeNewLines(string content) =>
        content.Replace("\r\n", "\n", StringComparison.Ordinal).TrimEnd() + "\n";
}
