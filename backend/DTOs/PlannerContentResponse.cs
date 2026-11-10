using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record PlannerContentResponse(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("reply")] string Reply,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("questions")] IReadOnlyList<string> Questions,
    [property: JsonPropertyName("plan")] IReadOnlyList<string> Plan,
    [property: JsonPropertyName("assumptions")] IReadOnlyList<string> Assumptions,
    [property: JsonPropertyName("language")] string? Language);
