namespace OrquestadorApi.Services.Drive;

public sealed class DisabledDriveStorage : IDriveStorage
{
    public bool IsEnabled => false;

    public Task<DriveFolderResult?> FindFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<DriveFolderResult?>(null);
    }

    public Task<DriveFolderResult> GetOrCreateFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new DriveFolderResult(
            Succeeded: false,
            FolderName: folderName,
            ErrorMessage: "La integración con Google Drive está deshabilitada."));
    }

    public Task<DriveUploadResult> UploadOrReplaceFileAsync(
        string fileName,
        string mimeType,
        Stream content,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new DriveUploadResult(
            Succeeded: false,
            FileName: fileName,
            ErrorMessage: "La integración con Google Drive está deshabilitada."));
    }

    public Task<DriveDownloadResult?> DownloadFileByNameAsync(
        string fileName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<DriveDownloadResult?>(null);
    }
}
