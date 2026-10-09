namespace OrquestadorApi.Services.AI;

public interface IAiProvider
{
    Task<string> GenerateContentAsync(
        string prompt,
        CancellationToken cancellationToken = default);
}
