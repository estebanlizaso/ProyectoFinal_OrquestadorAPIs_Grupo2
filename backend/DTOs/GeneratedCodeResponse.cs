using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record GeneratedCodeResponse(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("language")] string Language,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("questions")] IReadOnlyList<string> Questions,
    [property: JsonPropertyName("plan")] IReadOnlyList<string> Plan,
    [property: JsonPropertyName("code")] string? Code);
