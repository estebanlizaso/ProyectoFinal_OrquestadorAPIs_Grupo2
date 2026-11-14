using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Contexts;

public interface IProjectContextService
{
    Task<IReadOnlyList<ProjectMessageResponse>?> GetMessagesAsync(
        int projectId,
        int offset = 0,
        int limit = 50,
        CancellationToken cancellationToken = default);

    Task<SaveNodeInstructionsResult> SaveNodeInstructionsAsync(
        int projectId,
        string nodeKey,
        SaveNodeInstructionsRequest request,
        CancellationToken cancellationToken = default);

    Task<CreateProjectContextResult> CreateAsync(
        int projectId,
        string prompt,
        CancellationToken cancellationToken = default);

    Task<ProjectContextResponse?> GetAsync(
        int projectId,
        CancellationToken cancellationToken = default);

    Task<string?> GetInitialPromptAsync(
        int projectId,
        CancellationToken cancellationToken = default);

    Task<UpdateNodeNotesResult> UpdateNodeNotesAsync(
        int projectId,
        string nodeKey,
        string userNotes,
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
    int? ContextId = null,
    string? ErrorMessage = null);

public enum UpdateNodeNotesStatus
{
    Updated,
    NotFound,
    Conflict
}

public record UpdateNodeNotesResult(
    UpdateNodeNotesStatus Status,
    OrchestrationNodeResponse? Node = null);

public enum SaveNodeInstructionsStatus
{
    Saved,
    NotFound,
    Conflict
}

public record SaveNodeInstructionsResult(
    SaveNodeInstructionsStatus Status,
    NodeInstructionsResponse? Response = null);
