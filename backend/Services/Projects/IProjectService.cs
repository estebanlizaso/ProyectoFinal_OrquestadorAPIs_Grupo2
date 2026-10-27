using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Projects;

public interface IProjectService
{
    Task<CreateProjectResult> CreateAsync(
        string projectName,
        CancellationToken cancellationToken = default);

    Task<ProjectPage> GetAllAsync(
        string? search,
        int page,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int projectId, CancellationToken cancellationToken = default);
}

public enum CreateProjectStatus
{
    Created,
    DuplicateName
}

public record CreateProjectResult(CreateProjectStatus Status, ProjectResponse? Project = null);

/*
1. El cliente solicita GET /api/projects.
2. El servidor empieza a consultar PostgreSQL.
3. El cliente cierra la pestaña o cancela la petición.
4. ASP.NET marca el CancellationToken como cancelado.
5. Entity Framework cancela la consulta si todavía está ejecutándose.
*/
