using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.AI;

public interface IAiProvider
{
    Task<GeneratedCodeResponse> GenerateContentAsync(
        string prompt,
        CancellationToken cancellationToken = default);
}
