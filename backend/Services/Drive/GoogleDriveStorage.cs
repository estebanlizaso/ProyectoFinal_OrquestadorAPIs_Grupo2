using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Upload;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using DriveFile = Google.Apis.Drive.v3.Data.File;

namespace OrquestadorApi.Services.Drive;

public sealed class GoogleDriveStorage : IDriveStorage
{
    private const string FolderMimeType = "application/vnd.google-apps.folder";
    private static readonly string[] DriveScopes = [DriveService.Scope.Drive];

    private readonly DriveOptions _options;
    private readonly ILogger<GoogleDriveStorage> _logger;
    private readonly Lazy<DriveService> _driveService;

    public GoogleDriveStorage(
        IOptions<DriveOptions> options,
        IHostEnvironment environment,
        ILogger<GoogleDriveStorage> logger)
    {
        _options = options.Value;
        _logger = logger;
        _driveService = new Lazy<DriveService>(() => CreateDriveService(environment.ContentRootPath));
    }

    public bool IsEnabled => _options.IsConfigured;

    public async Task<DriveFolderResult?> FindFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return null;
        }

        var parentId = ResolveParentFolderId(parentFolderId);

        try
        {
            var service = _driveService.Value;
            var existingFolderId = await FindFileIdInFolderAsync(
                service,
                parentId,
                folderName,
                cancellationToken,
                FolderMimeType);

            if (existingFolderId is null)
            {
                return null;
            }

            var getRequest = service.Files.Get(existingFolderId);
            getRequest.Fields = "id, name, webViewLink";
            getRequest.SupportsAllDrives = true;
            var existing = await getRequest.ExecuteAsync(cancellationToken);

            return new DriveFolderResult(
                Succeeded: true,
                FolderName: existing.Name ?? folderName,
                FolderId: existing.Id,
                WebViewLink: existing.WebViewLink);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "No se pudo buscar la carpeta {FolderName}.", folderName);
            throw;
        }
    }

    public async Task<DriveFolderResult> GetOrCreateFolderAsync(
        string folderName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new DriveFolderResult(
                Succeeded: false,
                FolderName: folderName,
                ErrorMessage: "Google Drive no está configurado.");
        }

        var parentId = ResolveParentFolderId(parentFolderId);

        try
        {
            var existing = await FindFolderAsync(folderName, parentId, cancellationToken);
            if (existing is not null)
            {
                return existing;
            }

            var service = _driveService.Value;
            var metadata = new DriveFile
            {
                Name = folderName,
                MimeType = FolderMimeType,
                Parents = [parentId]
            };

            var createRequest = service.Files.Create(metadata);
            createRequest.Fields = "id, name, webViewLink";
            createRequest.SupportsAllDrives = true;
            var created = await createRequest.ExecuteAsync(cancellationToken);

            if (created?.Id is null)
            {
                throw new InvalidOperationException("Drive no devolvió el id de la carpeta creada.");
            }

            _logger.LogInformation(
                "Carpeta {FolderName} creada en Drive ({FolderId}).",
                folderName,
                created.Id);

            return new DriveFolderResult(
                Succeeded: true,
                FolderName: created.Name ?? folderName,
                FolderId: created.Id,
                WebViewLink: created.WebViewLink);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "No se pudo crear o resolver la carpeta {FolderName}.", folderName);

            return new DriveFolderResult(
                Succeeded: false,
                FolderName: folderName,
                ErrorMessage: exception.Message);
        }
    }

    public async Task<DriveUploadResult> UploadOrReplaceFileAsync(
        string fileName,
        string mimeType,
        Stream content,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return new DriveUploadResult(
                Succeeded: false,
                FileName: fileName,
                ErrorMessage: "Google Drive no está configurado.");
        }

        var parentId = ResolveParentFolderId(parentFolderId);

        try
        {
            var service = _driveService.Value;
            var existingFileId = await FindFileIdInFolderAsync(
                service,
                parentId,
                fileName,
                cancellationToken);

            DriveFile uploaded;

            if (existingFileId is null)
            {
                var metadata = new DriveFile
                {
                    Name = fileName,
                    Parents = [parentId]
                };

                var createRequest = service.Files.Create(metadata, content, mimeType);
                createRequest.Fields = "id, name, webViewLink";
                createRequest.SupportsAllDrives = true;
                var createProgress = await createRequest.UploadAsync(cancellationToken);
                EnsureUploadCompleted(createProgress, "subida");
                uploaded = createRequest.ResponseBody;
            }
            else
            {
                if (content.CanSeek)
                {
                    content.Position = 0;
                }

                var updateRequest = service.Files.Update(
                    new DriveFile { Name = fileName },
                    existingFileId,
                    content,
                    mimeType);
                updateRequest.Fields = "id, name, webViewLink";
                updateRequest.SupportsAllDrives = true;
                var updateProgress = await updateRequest.UploadAsync(cancellationToken);
                EnsureUploadCompleted(updateProgress, "actualización");
                uploaded = updateRequest.ResponseBody;
            }

            if (uploaded?.Id is null)
            {
                throw new InvalidOperationException("Drive no devolvió el id del archivo subido.");
            }

            _logger.LogInformation(
                "Archivo {FileName} subido a Drive ({FileId}).",
                fileName,
                uploaded.Id);

            return new DriveUploadResult(
                Succeeded: true,
                FileName: uploaded.Name ?? fileName,
                FileId: uploaded.Id,
                WebViewLink: uploaded.WebViewLink);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "No se pudo subir {FileName} a Google Drive.", fileName);

            return new DriveUploadResult(
                Succeeded: false,
                FileName: fileName,
                ErrorMessage: exception.Message);
        }
    }

    public async Task<DriveDownloadResult?> DownloadFileByNameAsync(
        string fileName,
        string? parentFolderId = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return null;
        }

        var parentId = ResolveParentFolderId(parentFolderId);

        try
        {
            var service = _driveService.Value;
            var fileId = await FindFileIdInFolderAsync(
                service,
                parentId,
                fileName,
                cancellationToken);

            if (fileId is null)
            {
                return null;
            }

            var getRequest = service.Files.Get(fileId);
            getRequest.Fields = "id, name, mimeType, webViewLink";
            getRequest.SupportsAllDrives = true;
            var metadata = await getRequest.ExecuteAsync(cancellationToken);

            await using var memory = new MemoryStream();
            var downloadRequest = service.Files.Get(fileId);
            downloadRequest.SupportsAllDrives = true;
            await downloadRequest.DownloadAsync(memory, cancellationToken);

            return new DriveDownloadResult(
                FileName: metadata.Name ?? fileName,
                MimeType: string.IsNullOrWhiteSpace(metadata.MimeType)
                    ? "application/octet-stream"
                    : metadata.MimeType,
                Content: memory.ToArray(),
                FileId: metadata.Id ?? fileId,
                WebViewLink: metadata.WebViewLink);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(exception, "No se pudo descargar {FileName} desde Google Drive.", fileName);
            throw;
        }
    }

    private string ResolveParentFolderId(string? parentFolderId)
    {
        if (!string.IsNullOrWhiteSpace(parentFolderId))
        {
            return parentFolderId.Trim();
        }

        return _options.RootFolderId!.Trim();
    }

    private DriveService CreateDriveService(string contentRootPath)
    {
        // OAuth de usuario primero: necesario para crear archivos en Drive personal.
        if (_options.HasUserOAuth)
        {
            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = _options.OAuthClientId!.Trim(),
                    ClientSecret = _options.OAuthClientSecret!.Trim()
                },
                Scopes = DriveScopes
            });

            var credential = new UserCredential(
                flow,
                "orquestador-user",
                new TokenResponse { RefreshToken = _options.OAuthRefreshToken!.Trim() });

            _logger.LogInformation("Google Drive autenticado con OAuth de usuario.");

            return new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "OrquestadorAPIs"
            });
        }

        var serviceAccountCredential = GoogleCredential
            .FromJson(ResolveCredentialsJson(contentRootPath))
            .CreateScoped(DriveScopes);

        _logger.LogInformation("Google Drive autenticado con Service Account.");

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = serviceAccountCredential,
            ApplicationName = "OrquestadorAPIs"
        });
    }

    private string ResolveCredentialsJson(string contentRootPath)
    {
        if (!string.IsNullOrWhiteSpace(_options.CredentialsJson))
        {
            return _options.CredentialsJson;
        }

        var path = _options.CredentialsPath!.Trim();
        if (!Path.IsPathRooted(path))
        {
            path = Path.Combine(contentRootPath, path);
        }

        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"No se encontró el archivo de credenciales de Drive en '{path}'.");
        }

        return File.ReadAllText(path);
    }

    private static async Task<string?> FindFileIdInFolderAsync(
        DriveService service,
        string folderId,
        string fileName,
        CancellationToken cancellationToken,
        string? mimeType = null)
    {
        var mimeFilter = mimeType is null
            ? $" and mimeType != '{FolderMimeType}'"
            : $" and mimeType = '{EscapeDriveQueryValue(mimeType)}'";

        var listRequest = service.Files.List();
        listRequest.Q =
            $"name = '{EscapeDriveQueryValue(fileName)}' and '{folderId}' in parents and trashed = false{mimeFilter}";
        listRequest.Fields = "files(id, name)";
        listRequest.PageSize = 1;
        listRequest.SupportsAllDrives = true;
        listRequest.IncludeItemsFromAllDrives = true;
        listRequest.Spaces = "drive";

        var response = await listRequest.ExecuteAsync(cancellationToken);
        return response.Files?.FirstOrDefault()?.Id;
    }

    private static void EnsureUploadCompleted(IUploadProgress progress, string operation)
    {
        if (progress.Status == UploadStatus.Completed)
        {
            return;
        }

        var details = progress.Exception?.Message;
        if (progress.Exception?.InnerException?.Message is { Length: > 0 } inner)
        {
            details = string.IsNullOrWhiteSpace(details) ? inner : $"{details} ({inner})";
        }

        var message = string.IsNullOrWhiteSpace(details)
            ? $"La {operation} a Drive no se completó ({progress.Status})."
            : $"La {operation} a Drive no se completó ({progress.Status}): {details}";

        if (details is not null)
        {
            if (details.Contains("notFound", StringComparison.OrdinalIgnoreCase) ||
                details.Contains("File not found", StringComparison.OrdinalIgnoreCase))
            {
                message +=
                    " No hay acceso a la carpeta (Google responde 404). " +
                    "Con OAuth, usá una carpeta de la misma cuenta autorizada. " +
                    "Con Service Account, compartí la carpeta con el client_email como Editor.";
            }
            else if (details.Contains("storageQuotaExceeded", StringComparison.OrdinalIgnoreCase) ||
                     details.Contains("Service Accounts do not have storage quota", StringComparison.OrdinalIgnoreCase))
            {
                message +=
                    " La Service Account no puede crear archivos en Drive personal. " +
                    "Configurá Drive__OAuthClientId, Drive__OAuthClientSecret y Drive__OAuthRefreshToken.";
            }
        }

        throw new InvalidOperationException(message, progress.Exception);
    }

    private static string EscapeDriveQueryValue(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("'", "\\'", StringComparison.Ordinal);
}
