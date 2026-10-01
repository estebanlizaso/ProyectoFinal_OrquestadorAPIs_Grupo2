using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectsResponse(
    [property: JsonPropertyName("body")]
    IReadOnlyList<ProjectResponse> Body);
