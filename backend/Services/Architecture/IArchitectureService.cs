using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public interface IArchitectureService
{
    Task<GenerateArchitectureResult> GenerateAsync(
        int projectId,
        string? language,
        CancellationToken cancellationToken = default);

    Task<DownloadArchitectureArtifactResult> DownloadPackageAsync(
        int projectId,
        CancellationToken cancellationToken = default);

    Task<DownloadArchitectureArtifactResult> DownloadPostmanCollectionAsync(
        int projectId,
        CancellationToken cancellationToken = default);
}

public enum GenerateArchitectureStatus
{
    Success,
    NotFound,
    NoDetectedContexts,
    TooManyContexts,
    LimitExceeded,
    InvalidLanguage,
    AiProviderFailed,
    DriveDisabled,
    DriveFailed
}

public record GenerateArchitectureResult(
    GenerateArchitectureStatus Status,
    ArchitectureResponse? Response = null,
    string? Message = null);

public enum DownloadArchitectureStatus
{
    Success,
    NotFound,
    DriveDisabled,
    DriveFailed
}

public record DownloadArchitectureArtifactResult(
    DownloadArchitectureStatus Status,
    string? FileName = null,
    string? ContentType = null,
    byte[]? Content = null,
    string? Message = null);
