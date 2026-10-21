using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectContextResponse(
    [property: JsonPropertyName("contextId")] int ContextId,
    [property: JsonPropertyName("projectId")] int ProjectId,
    [property: JsonPropertyName("initialPrompt")] string InitialPrompt,
    [property: JsonPropertyName("generatedContent")] GeneratedCodeResponse? GeneratedContent,
    [property: JsonPropertyName("planner")] PlannerContentResponse? Planner,
    [property: JsonPropertyName("nodes")] IReadOnlyList<OrchestrationNodeResponse> Nodes,
    [property: JsonPropertyName("relations")] IReadOnlyList<OrchestrationRelationResponse> Relations,
    [property: JsonPropertyName("mapVersion")] int MapVersion,
    [property: JsonPropertyName("resumen")] string? Resumen,
    [property: JsonPropertyName("updatedAt")] DateTime? UpdatedAt);
