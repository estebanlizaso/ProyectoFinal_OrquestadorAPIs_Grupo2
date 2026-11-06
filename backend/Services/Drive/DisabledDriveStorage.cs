namespace OrquestadorApi.Services.Drive;

public sealed class DisabledDriveStorage : IDriveStorage
{
    public bool IsEnabled => false;

    public Task<DriveUploadResult> UploadOrReplaceFileAsync(
        string fileName,
        string mimeType,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new DriveUploadResult(
            Succeeded: false,
            FileName: fileName,
            ErrorMessage: "La integración con Google Drive está deshabilitada."));
    }
}
