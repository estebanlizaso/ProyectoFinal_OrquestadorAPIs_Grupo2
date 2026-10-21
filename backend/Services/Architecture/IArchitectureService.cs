using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public interface IArchitectureService
{
    Task<GenerateArchitectureResult> GenerateAsync(
        int projectId,
        string? language,
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
    AiProviderFailed
}

public record GenerateArchitectureResult(
    GenerateArchitectureStatus Status,
    ArchitectureResponse? Response = null,
    string? Message = null);
