using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectContextGenerationErrorResponse(
    [property: JsonPropertyName("contextId")] int ContextId,
    [property: JsonPropertyName("message")] string Message);
