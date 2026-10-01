using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services;

public class ProjectService : IProjectService
{
    private readonly object _sync = new();

    private readonly List<ProjectResponse> _projects =
    [
        new(
            "sincronizacion cliente - pagos",
            "sarasa",
            1,
            new DateOnly(2026, 10, 1)),
        new(
            "sincronizacion cliente - pagos",
            "sarasa",
            2,
            new DateOnly(2026, 10, 1)),
        new(
            "sincronizacion cliente - pagos",
            "sarasa",
            3,
            new DateOnly(2026, 10, 1))
    ];

    public Task<IReadOnlyList<ProjectResponse>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (_sync)
        {
            return Task.FromResult<IReadOnlyList<ProjectResponse>>(_projects.ToArray());
        }
    }

    public Task<bool> DeleteAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (_sync)
        {
            var project = _projects.FirstOrDefault(project => project.ProjectId == projectId);

            if (project is null)
            {
                return Task.FromResult(false);
            }

            _projects.Remove(project);
            return Task.FromResult(true);
        }
    }
}
