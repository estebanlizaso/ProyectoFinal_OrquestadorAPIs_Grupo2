using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public sealed record ArchitecturePublicEndpoint(
    [property: JsonPropertyName("method")] string Method,
    [property: JsonPropertyName("path")] string Path,
    [property: JsonPropertyName("name")] string? Name = null,
    [property: JsonPropertyName("description")] string? Description = null,
    [property: JsonPropertyName("exampleBody")] string? ExampleBody = null,
    [property: JsonPropertyName("contentType")] string? ContentType = null);
