using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureDriveArtifactResponse(
    [property: JsonPropertyName("fileName")] string FileName,
    [property: JsonPropertyName("fileId")] string FileId,
    [property: JsonPropertyName("webViewLink")] string? WebViewLink);
