














using Microsoft.EntityFrameworkCore;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _dbContext;

    public ProjectService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ProjectPage> GetAllAsync(
        string? search,
        int page,
        CancellationToken cancellationToken = default)
    {
        var normalizedSearch = search?.Trim();

        var query = _dbContext.Projects
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(project =>
                EF.Functions.ILike(project.ProjectName, $"%{normalizedSearch}%"));
        }

        var projects = await query
            .OrderByDescending(project => project.CreatedAt)
            .ThenByDescending(project => project.ProjectId)
            .Skip(checked((page - 1) * PaginationSettings.PageSize))
            .Take(PaginationSettings.PageSize + 1)
            .ToListAsync(cancellationToken);

        var body = projects
            .Take(PaginationSettings.PageSize)
            .Select(project => new ProjectResponse(
                project.ProjectName,
                project.Description,
                project.ProjectId,
                project.CreatedAt.HasValue
                    ? DateOnly.FromDateTime(project.CreatedAt.Value)
                    : null))
            .ToList();

        return new ProjectPage(body, projects.Count > PaginationSettings.PageSize);
    }

    public async Task<bool> DeleteAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        var project = await _dbContext.Projects.FindAsync([projectId], cancellationToken);

        if (project is null)
        {
            return false;
        }

        _dbContext.Projects.Remove(project);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}
