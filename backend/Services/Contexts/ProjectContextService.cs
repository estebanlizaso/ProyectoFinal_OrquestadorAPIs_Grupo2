using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json;
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
    public async Task<string?> GetInitialPromptAsync(
    int projectId,
    CancellationToken cancellationToken = default)
    {
        return await _dbContext.Contexts
            .AsNoTracking()
            .Where(context => context.ProjectId == projectId)
            .Select(context => context.InitialPrompt)
            .SingleOrDefaultAsync(cancellationToken);
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
            var currentMessage = prompt.Trim();
            var agentInput = JsonSerializer.Serialize(new
            {
                initialPrompt = projectContext.InitialPrompt,
                resumen = projectContext.Resumen,
                userMessage = currentMessage
            });
            var generatedContent = await _aiProvider.GenerateContentAsync(agentInput, cancellationToken);
            if (generatedContent.Status == "out_of_scope")
            {
                return new CreateProjectContextResult(
                    contextWasCreated ? CreateProjectContextStatus.Created : CreateProjectContextStatus.Reused,
                    new ProjectContextResponse(
                        projectContext.ContextId, projectContext.ProjectId, projectContext.InitialPrompt,
                        generatedContent, projectContext.Resumen, projectContext.UpdatedAt));
            }

            var resumen = await _aiProvider.GenerateResumenAsync(
                projectContext.InitialPrompt, projectContext.Resumen, currentMessage,
                generatedContent, cancellationToken);

            if (_dbContext.Entry(projectContext).State == EntityState.Detached)
            {
                _dbContext.Contexts.Attach(projectContext);
            }

            projectContext.Resumen = resumen;
            projectContext.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new CreateProjectContextResult(
                contextWasCreated
                    ? CreateProjectContextStatus.Created
                    : CreateProjectContextStatus.Reused,
                new ProjectContextResponse(
                    projectContext.ContextId,
                    projectContext.ProjectId,
                    projectContext.InitialPrompt,
                    generatedContent,
                    projectContext.Resumen,
                    projectContext.UpdatedAt));
        }
        catch (DbUpdateConcurrencyException)
        {
            return new CreateProjectContextResult(
                CreateProjectContextStatus.Conflict, ContextId: projectContext.ContextId);
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
