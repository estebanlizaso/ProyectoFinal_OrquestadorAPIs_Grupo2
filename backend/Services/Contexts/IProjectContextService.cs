using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Contexts;

public interface IProjectContextService
{
    Task<CreateProjectContextResult> CreateAsync(
        int projectId,
        string prompt,
        CancellationToken cancellationToken = default);
    Task<string?> GetInitialPromptAsync(
    int projectId,
    CancellationToken cancellationToken = default);
}

public enum CreateProjectContextStatus
{
    Created,
    Reused,
    ProjectNotFound,
    Conflict,
    AiProviderFailed
}

public record CreateProjectContextResult(
    CreateProjectContextStatus Status,
    ProjectContextResponse? Context = null,
    int? ContextId = null);


