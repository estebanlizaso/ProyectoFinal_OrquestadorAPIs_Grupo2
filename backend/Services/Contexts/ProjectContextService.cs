using Microsoft.EntityFrameworkCore;
using Npgsql;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;

namespace OrquestadorApi.Services.Contexts;

public class ProjectContextService : IProjectContextService
{
    private readonly AppDbContext _dbContext;
    private readonly IAiProvider _aiProvider;
    private readonly ILogger<ProjectContextService> _logger;

    public ProjectContextService(
        AppDbContext dbContext,
        IAiProvider aiProvider,
        ILogger<ProjectContextService> logger)
    {
        _dbContext = dbContext;
        _aiProvider = aiProvider;
        _logger = logger;
    }

    public async Task<CreateProjectContextResult> CreateAsync(
        int projectId,
        string prompt,
        CancellationToken cancellationToken = default)
    {
        var projectExists = await _dbContext.Projects
            .AsNoTracking()
            .AnyAsync(project => project.ProjectId == projectId, cancellationToken);

        if (!projectExists)
        {
            return new CreateProjectContextResult(CreateProjectContextStatus.ProjectNotFound);
        }

        var projectContext = await _dbContext.Contexts
            .AsNoTracking()
            .SingleOrDefaultAsync(context => context.ProjectId == projectId, cancellationToken);
        var contextWasCreated = projectContext is null;

        if (projectContext is null)
        {
            projectContext = new ProjectContext
            {
                ProjectId = projectId,
                InitialPrompt = prompt.Trim()
            };

            _dbContext.Contexts.Add(projectContext);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException exception) when (
                exception.InnerException is PostgresException
                {
                    SqlState: PostgresErrorCodes.UniqueViolation
                })
            {
                _dbContext.Entry(projectContext).State = EntityState.Detached;
                projectContext = await _dbContext.Contexts
                    .AsNoTracking()
                    .SingleAsync(context => context.ProjectId == projectId, cancellationToken);
                contextWasCreated = false;
            }
        }

        try
        {
            var generatedContent = await _aiProvider.GenerateContentAsync(
                projectContext.InitialPrompt,
                cancellationToken);

            return new CreateProjectContextResult(
                contextWasCreated
                    ? CreateProjectContextStatus.Created
                    : CreateProjectContextStatus.Reused,
                new ProjectContextResponse(
                    projectContext.ContextId,
                    projectContext.ProjectId,
                    projectContext.InitialPrompt,
                    generatedContent));
        }
        catch (AiProviderException exception)
        {
            _logger.LogError(
                exception,
                "No se pudo generar el contexto {ContextId} del proyecto {ProjectId}.",
                projectContext.ContextId,
                projectContext.ProjectId);

            return new CreateProjectContextResult(
                CreateProjectContextStatus.AiProviderFailed,
                ContextId: projectContext.ContextId);
        }
    }
}
