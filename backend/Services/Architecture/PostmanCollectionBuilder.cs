using System.Text.Json;
using System.Text.RegularExpressions;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public sealed class PostmanCollectionBuilder : IPostmanCollectionBuilder
{
    private static readonly Regex OperationPattern =
        new(@"^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)$",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public string BuildFileName() => "postman_collection.json";

    public JsonElement Build(
        string projectName,
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations)
    {
        var nodeByKey = nodes.ToDictionary(node => node.Key, StringComparer.OrdinalIgnoreCase);
        var requestsByTarget = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);

        foreach (var relation in relations)
        {
            if (!TryResolveHttp(relation, out var method, out var path))
            {
                continue;
            }

            if (!requestsByTarget.TryGetValue(relation.To, out var folderItems))
            {
                folderItems = [];
                requestsByTarget[relation.To] = folderItems;
            }

            folderItems.Add(BuildRequestItem(relation, method, path));
        }

        var folders = new List<object>();

        foreach (var context in architecture.Contexts)
        {
            if (!requestsByTarget.TryGetValue(context.Key, out var items) || items.Count == 0)
            {
                continue;
            }

            folders.Add(new
            {
                name = $"{context.Name} ({context.Key})",
                description = context.Summary,
                item = items
            });
        }

        foreach (var (targetKey, items) in requestsByTarget
                     .Where(pair => architecture.Contexts.All(
                         context => !string.Equals(context.Key, pair.Key, StringComparison.OrdinalIgnoreCase)))
                     .OrderBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase))
        {
            var nodeName = nodeByKey.TryGetValue(targetKey, out var node)
                ? node.Name
                : targetKey;

            folders.Add(new
            {
                name = $"{nodeName} ({targetKey})",
                item = items
            });
        }

        var variables = BuildVariables(architecture);
        var collection = new
        {
            info = new
            {
                name = $"Proyecto {architecture.ProjectId} - {projectName}",
                description =
                    "Collection generada desde el mapa de orquestación para probar los endpoints de cada nodo.\n\n" +
                    architecture.Summary,
                schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item = folders,
            variable = variables
        };

        return JsonSerializer.SerializeToElement(collection, JsonOptions);
    }

    private static object BuildRequestItem(
        OrchestrationRelationResponse relation,
        string method,
        string path)
    {
        var rawUrl = path.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? path
            : "{{baseUrl}}" + (path.StartsWith('/') ? path : "/" + path);

        var url = BuildUrl(rawUrl);
        var name = string.IsNullOrWhiteSpace(relation.Label)
            ? $"{method} {path}"
            : $"{relation.Label} ({method} {path})";

        return new
        {
            name,
            request = new
            {
                method = method.ToUpperInvariant(),
                header = Array.Empty<object>(),
                description = relation.Description,
                url
            }
        };
    }

    private static object BuildUrl(string rawUrl)
    {
        if (!Uri.TryCreate(
                rawUrl.Replace("{{baseUrl}}", "http://localhost", StringComparison.Ordinal),
                UriKind.Absolute,
                out var parsed))
        {
            return rawUrl;
        }

        var pathSegments = parsed.AbsolutePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => (object)segment)
            .ToList();

        var query = string.IsNullOrEmpty(parsed.Query)
            ? Array.Empty<object>()
            : parsed.Query.TrimStart('?')
                .Split('&', StringSplitOptions.RemoveEmptyEntries)
                .Select(part =>
                {
                    var pieces = part.Split('=', 2);
                    return (object)new
                    {
                        key = pieces[0],
                        value = pieces.Length > 1 ? pieces[1] : string.Empty
                    };
                })
                .ToArray();

        var host = rawUrl.StartsWith("{{baseUrl}}", StringComparison.Ordinal)
            ? new object[] { "{{baseUrl}}" }
            : parsed.Host.Split('.', StringSplitOptions.RemoveEmptyEntries).Cast<object>().ToArray();

        return new
        {
            raw = rawUrl,
            protocol = rawUrl.StartsWith("{{baseUrl}}", StringComparison.Ordinal) ? null : parsed.Scheme,
            host,
            path = pathSegments,
            query
        };
    }

    private static List<object> BuildVariables(ArchitectureResponse architecture)
    {
        var variables = new List<object>
        {
            new
            {
                key = "baseUrl",
                value = ResolveDefaultBaseUrl(architecture),
                type = "string"
            }
        };

        foreach (var envVar in architecture.Contexts
                     .SelectMany(context => context.Env)
                     .GroupBy(env => env.Name, StringComparer.OrdinalIgnoreCase)
                     .Select(group => group.First()))
        {
            variables.Add(new
            {
                key = envVar.Name,
                value = envVar.Example ?? string.Empty,
                type = "string",
                description = envVar.Description
            });
        }

        return variables;
    }

    private static string ResolveDefaultBaseUrl(ArchitectureResponse architecture)
    {
        foreach (var envVar in architecture.Contexts.SelectMany(context => context.Env))
        {
            if (!string.IsNullOrWhiteSpace(envVar.Example) &&
                Uri.TryCreate(envVar.Example, UriKind.Absolute, out var uri) &&
                (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            {
                return envVar.Example.TrimEnd('/');
            }
        }

        return "http://localhost:3000";
    }

    private static bool TryResolveHttp(
        OrchestrationRelationResponse relation,
        out string method,
        out string path)
    {
        if (!string.IsNullOrWhiteSpace(relation.HttpMethod) &&
            !string.IsNullOrWhiteSpace(relation.Path))
        {
            method = relation.HttpMethod.Trim();
            path = relation.Path.Trim();
            return true;
        }

        if (!string.IsNullOrWhiteSpace(relation.Operation))
        {
            var match = OperationPattern.Match(relation.Operation.Trim());
            if (match.Success)
            {
                method = match.Groups[1].Value;
                path = match.Groups[2].Value;
                return true;
            }
        }

        method = string.Empty;
        path = string.Empty;
        return false;
    }
}
