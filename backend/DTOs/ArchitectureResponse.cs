using System.Text.Json;
using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureResponse(
    [property: JsonPropertyName("contextId")] int ContextId,
    [property: JsonPropertyName("projectId")] int ProjectId,
    [property: JsonPropertyName("language")] string Language,
    [property: JsonPropertyName("mapVersion")] int MapVersion,
    [property: JsonPropertyName("generatedAt")] DateTime GeneratedAt,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("envExample")] string? EnvExample,
    [property: JsonPropertyName("contexts")] IReadOnlyList<ArchitectureContextResponse> Contexts,
    [property: JsonPropertyName("warnings")] IReadOnlyList<string> Warnings,
    [property: JsonPropertyName("contextChanged")] bool ContextChanged,
    [property: JsonPropertyName("drive")] ArchitectureDriveArtifactResponse? Drive = null,
    [property: JsonPropertyName("postmanCollection")] JsonElement? PostmanCollection = null,
    [property: JsonPropertyName("goToDrive")] string? GoToDrive = null,
    [property: JsonPropertyName("downloadFile")] string? DownloadFile = null,
    [property: JsonPropertyName("downloadPostmanCollection")] string? DownloadPostmanCollection = null);
