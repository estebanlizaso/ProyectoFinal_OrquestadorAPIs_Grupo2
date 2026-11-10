using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record OrchestrationNodeResponse(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("key")] string Key,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("role")] string? Role,
    [property: JsonPropertyName("responsibility")] string? Responsibility,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("userNotes")] string? UserNotes,
    [property: JsonPropertyName("isActive")] bool IsActive,
    [property: JsonPropertyName("sortOrder")] int SortOrder);
