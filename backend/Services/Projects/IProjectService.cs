using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Projects;

public interface IProjectService
{
    Task<ProjectResponse> CreateAsync(
        string projectName,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProjectResponse>> GetAllAsync(
        string? search,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int projectId, CancellationToken cancellationToken = default);
}

/*
1. El cliente solicita GET /api/projects.
2. El servidor empieza a consultar PostgreSQL.
3. El cliente cierra la pestaña o cancela la petición.
4. ASP.NET marca el CancellationToken como cancelado.
5. Entity Framework cancela la consulta si todavía está ejecutándose.
*/
