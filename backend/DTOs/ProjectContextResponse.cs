using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectContextResponse(
    [property: JsonPropertyName("contextId")] int ContextId,
    [property: JsonPropertyName("projectId")] int ProjectId,
    [property: JsonPropertyName("initialPrompt")] string InitialPrompt,
    [property: JsonPropertyName("generatedContent")] GeneratedCodeResponse GeneratedContent);
