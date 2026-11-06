namespace OrquestadorApi.Services.Drive;

public interface IDriveStorage
{
    bool IsEnabled { get; }

    Task<DriveUploadResult> UploadOrReplaceFileAsync(
        string fileName,
        string mimeType,
        Stream content,
        CancellationToken cancellationToken = default);
}

public record DriveUploadResult(
    bool Succeeded,
    string FileName,
    string? FileId = null,
    string? WebViewLink = null,
    string? ErrorMessage = null);
