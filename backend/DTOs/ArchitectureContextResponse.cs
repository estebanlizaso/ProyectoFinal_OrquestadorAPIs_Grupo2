using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureContextResponse(
    [property: JsonPropertyName("key")] string Key,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("dependencies")] IReadOnlyList<string> Dependencies,
    [property: JsonPropertyName("env")] IReadOnlyList<ArchitectureEnvVarResponse> Env,
    [property: JsonPropertyName("assumptions")] IReadOnlyList<string> Assumptions,
    [property: JsonPropertyName("warnings")] IReadOnlyList<string> Warnings);
