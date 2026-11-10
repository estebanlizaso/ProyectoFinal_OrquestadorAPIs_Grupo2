using System.Globalization;
using System.Text;
using OrquestadorApi.Configuration;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;

namespace OrquestadorApi.Services.Contexts;

public sealed record NormalizedPlannerNode(
    string Key,
    string Name,
    string? Description,
    string Kind,
    string? Role,
    string? Responsibility,
    string Status);

public sealed record NormalizedPlannerRelation(
    string From,
    string To,
    string Label,
    string? Operation,
    string? Description,
    string? Kind);

public sealed record NormalizedPlannerResponse(
    string Status,
    string Reply,
    string Summary,
    IReadOnlyList<string> Questions,
    IReadOnlyList<string> Plan,
    IReadOnlyList<string> Assumptions,
    string? Language,
    IReadOnlyList<NormalizedPlannerNode> Nodes,
    IReadOnlyList<NormalizedPlannerRelation> Relations);

public static class PlannerResponseNormalizer
{
    private static readonly HashSet<string> AllowedStatuses =
        new(StringComparer.Ordinal) { "needs_clarification", "ready", "out_of_scope" };

    private static readonly HashSet<string> AllowedKinds =
        new(StringComparer.Ordinal) { "system", "orchestrator", "actor", "step" };

    private static readonly HashSet<string> AllowedNodeStatuses =
        new(StringComparer.Ordinal) { "detected", "assumed", "confirmed" };

    private static readonly HashSet<string> AllowedRelationKinds =
        new(StringComparer.Ordinal) { "sync", "async" };

    public static NormalizedPlannerResponse Normalize(
        PlannerAiResponse response,
        OrchestrationOptions options)
    {
        var status = NormalizeStatus(response.Status);
        var reply = RequireText(response.Reply, "reply");
        var summary = RequireText(response.Summary, "summary");
        var questions = NormalizeStringList(response.Questions);
        var plan = NormalizeStringList(response.Plan);
        var assumptions = NormalizeStringList(response.Assumptions);
        var language = NormalizeLanguage(response.Language);
        var nodes = NormalizeNodes(response.Nodes, options);
        var relations = NormalizeRelations(response.Relations, nodes, options);

        if (questions.Count > options.MaxQuestions)
        {
            throw new AiProviderException(
                $"El planificador devolvió más de {options.MaxQuestions} preguntas.");
        }

        switch (status)
        {
            case "out_of_scope":
                if (questions.Count > 0 || plan.Count > 0 || nodes.Count > 0 || relations.Count > 0)
                {
                    throw new AiProviderException(
                        "El planificador devolvió un estado out_of_scope con preguntas, plan, nodos o relaciones.");
                }
                language = null;
                break;

            case "needs_clarification":
                if (questions.Count == 0)
                {
                    throw new AiProviderException(
                        "El planificador devolvió needs_clarification sin preguntas.");
                }
                break;

            case "ready":
                if (questions.Count > 0)
                {
                    throw new AiProviderException(
                        "El planificador devolvió ready con preguntas abiertas.");
                }
                if (plan.Count == 0)
                {
                    throw new AiProviderException(
                        "El planificador devolvió ready sin pasos de ejecución.");
                }
                if (!nodes.Any(node => node.Kind == "system"))
                {
                    throw new AiProviderException(
                        "El planificador devolvió ready sin ningún contexto de tipo system.");
                }
                break;
        }

        return new NormalizedPlannerResponse(
            status,
            reply,
            summary,
            questions,
            plan,
            assumptions,
            language,
            nodes,
            relations);
    }

    public static string? NormalizeLanguage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.Contains("python") || normalized == "py")
        {
            return "python";
        }

        if (normalized.Contains("dotnet") ||
            normalized.Contains(".net") ||
            normalized.Contains("csharp") ||
            normalized.Contains("c#"))
        {
            return "dotnet";
        }

        throw new AiProviderException(
            $"El planificador devolvió el lenguaje no soportado '{value}'. Usá python o dotnet.");
    }

    public static string Slugify(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        var lastWasSeparator = false;

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(character))
            {
                builder.Append(char.ToLowerInvariant(character));
                lastWasSeparator = false;
                continue;
            }

            if (!lastWasSeparator && builder.Length > 0)
            {
                builder.Append('-');
                lastWasSeparator = true;
            }
        }

        var slug = builder.ToString().Trim('-');

        if (slug.Length > 80)
        {
            slug = slug[..80].Trim('-');
        }

        return slug;
    }

    private static IReadOnlyList<NormalizedPlannerNode> NormalizeNodes(
        IReadOnlyList<PlannerAiNode> nodes,
        OrchestrationOptions options)
    {
        if (nodes.Count > options.MaxNodes)
        {
            throw new AiProviderException(
                $"El planificador devolvió {nodes.Count} nodos y el máximo es {options.MaxNodes}.");
        }

        var normalizedNodes = new List<NormalizedPlannerNode>(nodes.Count);
        var keys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var node in nodes)
        {
            if (node is null)
            {
                throw new AiProviderException("El planificador devolvió un nodo nulo.");
            }

            var key = Slugify(node.Key);
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new AiProviderException(
                    $"El planificador devolvió una key inválida para el nodo '{node.Name}'.");
            }

            if (!keys.Add(key))
            {
                throw new AiProviderException(
                    $"El planificador devolvió la key duplicada '{key}'.");
            }

            var kind = NormalizeKind(node.Kind);
            var rawStatus = node.Status?.Trim().ToLowerInvariant() ?? string.Empty;
            var status = AllowedNodeStatuses.Contains(rawStatus) ? rawStatus : "detected";

            normalizedNodes.Add(new NormalizedPlannerNode(
                key,
                RequireText(node.Name, $"nodes[{key}].name"),
                TrimToNull(node.Description),
                kind,
                NormalizeRole(node.Role),
                TrimToNull(node.Responsibility),
                status));
        }

        var systemCount = normalizedNodes.Count(node => node.Kind == "system");
        if (systemCount > options.MaxSystemContexts)
        {
            throw new AiProviderException(
                $"El planificador devolvió {systemCount} contextos system y el máximo es {options.MaxSystemContexts}.");
        }

        return normalizedNodes;
    }

    private static IReadOnlyList<NormalizedPlannerRelation> NormalizeRelations(
        IReadOnlyList<PlannerAiRelation> relations,
        IReadOnlyList<NormalizedPlannerNode> nodes,
        OrchestrationOptions options)
    {
        if (relations.Count > options.MaxRelations)
        {
            throw new AiProviderException(
                $"El planificador devolvió {relations.Count} relaciones y el máximo es {options.MaxRelations}.");
        }

        var nodeKeys = nodes.Select(node => node.Key).ToHashSet(StringComparer.Ordinal);
        var normalizedRelations = new List<NormalizedPlannerRelation>(relations.Count);
        var relationKeys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var relation in relations)
        {
            if (relation is null)
            {
                throw new AiProviderException("El planificador devolvió una relación nula.");
            }

            var from = Slugify(relation.From);
            var to = Slugify(relation.To);

            if (!nodeKeys.Contains(from))
            {
                throw new AiProviderException(
                    $"La relación apunta al nodo inexistente '{relation.From}'.");
            }

            if (!nodeKeys.Contains(to))
            {
                throw new AiProviderException(
                    $"La relación apunta al nodo inexistente '{relation.To}'.");
            }

            if (from == to)
            {
                throw new AiProviderException(
                    $"El planificador devolvió una relación de '{from}' consigo mismo.");
            }

            var label = RequireText(relation.Label, $"relations[{from}->{to}].label");
            var relationKey = $"{from}|{to}|{label}";

            if (!relationKeys.Add(relationKey))
            {
                throw new AiProviderException(
                    $"El planificador devolvió la relación duplicada '{from} -> {to} ({label})'.");
            }

            var kind = relation.Kind?.Trim().ToLowerInvariant();
            normalizedRelations.Add(new NormalizedPlannerRelation(
                from,
                to,
                label,
                TrimToNull(relation.Operation),
                TrimToNull(relation.Description),
                kind is not null && AllowedRelationKinds.Contains(kind) ? kind : null));
        }

        return normalizedRelations;
    }

    private static string NormalizeStatus(string? value)
    {
        var status = value?.Trim().ToLowerInvariant() ?? string.Empty;

        if (!AllowedStatuses.Contains(status))
        {
            throw new AiProviderException(
                $"El planificador devolvió el estado desconocido '{value}'.");
        }

        return status;
    }

    private static string NormalizeKind(string? value)
    {
        var kind = value?.Trim().ToLowerInvariant() ?? string.Empty;

        if (!AllowedKinds.Contains(kind))
        {
            throw new AiProviderException(
                $"El planificador devolvió el tipo de nodo desconocido '{value}'.");
        }

        return kind;
    }

    private static string? NormalizeRole(string? value)
    {
        var role = value?.Trim().ToLowerInvariant();

        return role switch
        {
            "consumer" or "client" or "caller" => "consumer",
            "provider" or "server" or "exposed" => "provider",
            "orchestrator" => "orchestrator",
            "both" => "both",
            _ => null
        };
    }

    private static IReadOnlyList<string> NormalizeStringList(IReadOnlyList<string>? values)
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

    private static string RequireText(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new AiProviderException(
                $"El planificador devolvió el campo obligatorio '{field}' vacío.");
        }

        return value.Trim();
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
