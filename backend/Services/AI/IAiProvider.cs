using OrquestadorApi.Services.AI.Contracts;

namespace OrquestadorApi.Services.AI;

public interface IAiProvider
{
    Task<PlannerAiResponse> GeneratePlanAsync(
        string agentInput,
        CancellationToken cancellationToken = default);

    Task<string> GenerateResumenAsync(
        string initialPrompt,
        string? previousResumen,
        string userMessage,
        PlannerAiResponse response,
        IReadOnlyList<PlannerNodeNote> nodeNotes,
        CancellationToken cancellationToken = default);

    Task<ArchitectureAiResponse> GenerateArchitectureAsync(
        string agentInput,
        CancellationToken cancellationToken = default);
}
