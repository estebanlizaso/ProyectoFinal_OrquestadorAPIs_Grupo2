using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record OrchestrationRelationResponse(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("from")] string From,
    [property: JsonPropertyName("to")] string To,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("operation")] string? Operation,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("kind")] string? Kind,
    [property: JsonPropertyName("sortOrder")] int SortOrder);
