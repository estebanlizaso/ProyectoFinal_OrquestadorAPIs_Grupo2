using System.Text.Json;
using System.Text.RegularExpressions;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public sealed class PostmanCollectionBuilder : IPostmanCollectionBuilder
{
    private const string DefaultBaseUrl = "http://127.0.0.1:5000";

    private static readonly HashSet<string> AllowedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"
    };

    private static readonly Regex AbsoluteUrlPattern =
        new(@"^https?://", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public string BuildFileName() => "postman_collection.json";

    public JsonElement Build(string projectName, ArchitectureResponse architecture)
    {
        var endpoints = architecture.PublicEndpoints ?? [];
        var items = endpoints
            .Select(BuildRequestItem)
            .Where(item => item is not null)
            .Cast<object>()
            .ToList();

        var collection = new
        {
            info = new
            {
                name = $"Proyecto {architecture.ProjectId} - {projectName}",
                description =
                    "Collection generada desde los endpoints públicos locales documentados en USAGE.md.\n\n" +
                    architecture.Summary,
                schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            item = items,
            variable = BuildVariables(architecture)
        };

        return JsonSerializer.SerializeToElement(collection, JsonOptions);
    }

    private static object? BuildRequestItem(ArchitecturePublicEndpoint endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint.Method) ||
            !AllowedMethods.Contains(endpoint.Method.Trim()))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(endpoint.Path) ||
            AbsoluteUrlPattern.IsMatch(endpoint.Path.Trim()))
        {
            return null;
        }

        var method = endpoint.Method.Trim().ToUpperInvariant();
        var path = NormalizePath(endpoint.Path);
        var rawUrl = "{{baseUrl}}" + path;
        var name = string.IsNullOrWhiteSpace(endpoint.Name)
            ? $"{method} {path}"
            : endpoint.Name.Trim();

        var headers = new List<object>();
        var contentType = string.IsNullOrWhiteSpace(endpoint.ContentType)
            ? null
            : endpoint.ContentType.Trim();
        var hasBody = !string.IsNullOrWhiteSpace(endpoint.ExampleBody);

        if (hasBody && contentType is null)
        {
            contentType = "application/json";
        }

        if (contentType is not null)
        {
            headers.Add(new { key = "Content-Type", value = contentType });
        }

        object? body = null;
        if (hasBody)
        {
            var language = contentType is not null &&
                contentType.Contains("json", StringComparison.OrdinalIgnoreCase)
                    ? "json"
                    : "text";
            body = new
            {
                mode = "raw",
                raw = endpoint.ExampleBody,
                options = new
                {
                    raw = new { language }
                }
            };
        }

        return new
        {
            name,
            request = new
            {
                method,
                header = headers,
                description = endpoint.Description,
                body,
                url = BuildUrl(rawUrl)
            }
        };
    }

    private static string NormalizePath(string path)
    {
        var trimmed = path.Trim();
        return trimmed.StartsWith('/') ? trimmed : "/" + trimmed;
    }

    private static object BuildUrl(string rawUrl)
    {
        if (!Uri.TryCreate(
                rawUrl.Replace("{{baseUrl}}", DefaultBaseUrl, StringComparison.Ordinal),
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

        return new
        {
            raw = rawUrl,
            host = new object[] { "{{baseUrl}}" },
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
                value = DefaultBaseUrl,
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
}
