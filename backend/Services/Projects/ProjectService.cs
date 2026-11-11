using Microsoft.EntityFrameworkCore;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;

namespace OrquestadorApi.Services.Projects;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _dbContext;

    public ProjectService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CreateProjectResult> CreateAsync(
        string projectName,
        CancellationToken cancellationToken = default)
    {
        if (await ProjectNameUniqueness.ExistsAsync(_dbContext, projectName, cancellationToken))
        {
            return new(CreateProjectStatus.DuplicateName);
        }

        var createdAt = DateTime.UtcNow;
        var project = new Project
        {
            ProjectName = projectName.Trim(' '),
            CreatedAt = createdAt
        };

        _dbContext.Projects.Add(project);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (ProjectNameUniqueness.IsViolation(exception))
        {
            _dbContext.Entry(project).State = EntityState.Detached;
            return new(CreateProjectStatus.DuplicateName);
        }

        return new(CreateProjectStatus.Created, new ProjectResponse(
            project.ProjectName,
            project.Description,
            project.ProjectId,
            DateOnly.FromDateTime(createdAt)));
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

    public async Task<ProjectProgressResponse?> GetProgressAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        var stage = await _dbContext.Projects
            .AsNoTracking()
            .Where(project => project.ProjectId == projectId)
            .Select(project => (ProjectStage?)project.LastReachedStage)
            .SingleOrDefaultAsync(cancellationToken);

        return stage is null ? null : new ProjectProgressResponse(stage.Value switch
        {
            ProjectStage.Context => "context",
            ProjectStage.Architecture => "architecture",
            ProjectStage.Generation => "generation",
            _ => throw new InvalidOperationException("Etapa de proyecto desconocida.")
        });
    }

    public async Task<ProjectProgressResponse?> AdvanceProgressAsync(
        int projectId,
        string stage,
        CancellationToken cancellationToken = default)
    {
        var requestedStage = stage switch
        {
            "context" => ProjectStage.Context,
            "architecture" => ProjectStage.Architecture,
            "generation" => ProjectStage.Generation,
            _ => throw new ArgumentException("Etapa de proyecto inválida.", nameof(stage))
        };

        // Compare and update in one SQL statement: concurrent requests cannot regress progress.
        await _dbContext.Projects
            .Where(project => project.ProjectId == projectId &&
                (int)project.LastReachedStage < (int)requestedStage)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(project => project.LastReachedStage, requestedStage), cancellationToken);

        return await GetProgressAsync(projectId, cancellationToken);
    }
}
