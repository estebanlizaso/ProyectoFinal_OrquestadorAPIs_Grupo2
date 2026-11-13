using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureDriveArtifactResponse(
    [property: JsonPropertyName("fileName")] string FileName,
    [property: JsonPropertyName("fileId")] string FileId,
    [property: JsonPropertyName("webViewLink")] string? WebViewLink,
    [property: JsonPropertyName("folderId")] string? FolderId = null,
    [property: JsonPropertyName("folderName")] string? FolderName = null,
    [property: JsonPropertyName("folderWebViewLink")] string? FolderWebViewLink = null);
