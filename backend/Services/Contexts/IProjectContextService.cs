using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Contexts;

public interface IProjectContextService
{
    Task<CreateProjectContextResult> CreateAsync(
        int projectId,
        string prompt,
        CancellationToken cancellationToken = default);
}

public enum CreateProjectContextStatus
{
    Created,
    Reused,
    ProjectNotFound,
    AiProviderFailed
}

public record CreateProjectContextResult(
    CreateProjectContextStatus Status,
    ProjectContextResponse? Context = null,
    int? ContextId = null);
