using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectResponse(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("projectId")] int ProjectId,
    [property: JsonPropertyName("created_at")] DateOnly? CreatedAt);
