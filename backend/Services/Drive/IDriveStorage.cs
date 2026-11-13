namespace OrquestadorApi.Services.Drive;

public interface IDriveStorage
{
    bool IsEnabled { get; }

    Task<DriveFolderResult?> FindFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default);

    Task<DriveFolderResult> GetOrCreateFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default);

    Task<DriveUploadResult> UploadOrReplaceFileAsync(
        string fileName,
        string mimeType,
        Stream content,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default);

    Task<DriveDownloadResult?> DownloadFileByNameAsync(
        string fileName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default);
}

public record DriveUploadResult(
    bool Succeeded,
    string FileName,
    string? FileId = null,
    string? WebViewLink = null,
    string? ErrorMessage = null);

public record DriveFolderResult(
    bool Succeeded,
    string FolderName,
    string? FolderId = null,
    string? WebViewLink = null,
    string? ErrorMessage = null);

public record DriveDownloadResult(
    string FileName,
    string MimeType,
    byte[] Content,
    string FileId,
    string? WebViewLink = null);
