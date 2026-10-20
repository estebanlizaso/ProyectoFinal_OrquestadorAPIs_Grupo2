using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.AI;

public interface IAiProvider
{
    Task<string> GenerateResumenAsync(
        string initialPrompt,
        string? previousResumen,
        string userMessage,
        GeneratedCodeResponse response,
        CancellationToken cancellationToken = default);

    Task<GeneratedCodeResponse> GenerateContentAsync(
        string prompt,
        CancellationToken cancellationToken = default);
}
