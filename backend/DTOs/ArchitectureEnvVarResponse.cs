using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureEnvVarResponse(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("example")] string? Example,
    [property: JsonPropertyName("description")] string? Description);
