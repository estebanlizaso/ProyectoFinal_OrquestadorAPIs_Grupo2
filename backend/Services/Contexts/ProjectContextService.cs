using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.DTOs;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;

namespace OrquestadorApi.Services.Contexts;

public class ProjectContextService : IProjectContextService
{
    private readonly AppDbContext _dbContext;
    private readonly IAiProvider _aiProvider;
    private readonly OrchestrationOptions _options;
    private readonly ILogger<ProjectContextService> _logger;

    public ProjectContextService(
        AppDbContext dbContext,
        IAiProvider aiProvider,
        IOptions<OrchestrationOptions> options,
        ILogger<ProjectContextService> logger)
    {
        _dbContext = dbContext;
        _aiProvider = aiProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ProjectContextResponse?> GetAsync(
        int projectId,
        CancellationToken cancellationToken = default)
    {
        var projectContext = await _dbContext.Contexts
            .AsNoTracking()
            .SingleOrDefaultAsync(context => context.ProjectId == projectId, cancellationToken);

        if (projectContext is null)
        {
            return null;
        }

        var nodes = await _dbContext.OrchestrationNodes
            .AsNoTracking()
            .Where(node => node.ContextId == projectContext.ContextId && node.IsActive)
            .OrderBy(node => node.SortOrder)
            .ThenBy(node => node.Key)
            .ToListAsync(cancellationToken);

        var relations = await _dbContext.OrchestrationRelations
            .AsNoTracking()
            .Where(relation => relation.ContextId == projectContext.ContextId)
            .OrderBy(relation => relation.SortOrder)
            .ThenBy(relation => relation.RelationId)
            .ToListAsync(cancellationToken);

        return ProjectContextMapper.ToResponse(projectContext, nodes, relations);
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

        var previousNodes = await _dbContext.OrchestrationNodes
            .AsNoTracking()
            .Where(node => node.ContextId == projectContext.ContextId)
            .OrderBy(node => node.SortOrder)
            .ThenBy(node => node.Key)
            .ToListAsync(cancellationToken);

        var previousRelations = await _dbContext.OrchestrationRelations
            .AsNoTracking()
            .Where(relation => relation.ContextId == projectContext.ContextId)
            .OrderBy(relation => relation.SortOrder)
            .ThenBy(relation => relation.RelationId)
            .ToListAsync(cancellationToken);

        try
        {
            var currentMessage = prompt.Trim();
            var activePreviousNodes = previousNodes
                .Where(node => node.IsActive)
                .ToList();
            var previousKeysById = activePreviousNodes
                .ToDictionary(node => node.NodeId, node => node.Key);
            var activePreviousNodeIds = previousKeysById.Keys.ToHashSet();

            previousRelations = previousRelations
                .Where(relation =>
                    activePreviousNodeIds.Contains(relation.SourceNodeId) &&
                    activePreviousNodeIds.Contains(relation.TargetNodeId))
                .ToList();

            var plannerInput = JsonSerializer.Serialize(
                new
                {
                    initialPrompt = projectContext.InitialPrompt,
                    resumen = projectContext.Resumen,
                    userMessage = currentMessage,
                    language = projectContext.Language,
                    previousNodes = activePreviousNodes.Select(node => new
                    {
                        key = node.Key,
                        name = node.Name,
                        description = node.Description,
                        kind = node.Kind,
                        role = node.Role,
                        responsibility = node.Responsibility,
                        status = node.Status,
                        userNotes = node.UserNotes,
                        isActive = node.IsActive
                    }),
                    previousRelations = previousRelations.Select(relation => new
                    {
                        from = previousKeysById[relation.SourceNodeId],
                        to = previousKeysById[relation.TargetNodeId],
                        label = relation.Label,
                        operation = relation.Operation,
                        description = relation.Description,
                        kind = relation.Kind
                    })
                },
                JsonSerializerOptions.Web);

            var plannerResponse = await _aiProvider.GeneratePlanAsync(
                plannerInput,
                cancellationToken);
            var planner = PlannerResponseNormalizer.Normalize(plannerResponse, _options);

            if (planner.Status == "out_of_scope")
            {
                var plannerContent = new PlannerContentResponse(
                    planner.Status,
                    planner.Reply,
                    planner.Summary,
                    planner.Questions,
                    planner.Plan,
                    planner.Assumptions,
                    planner.Language);
                var generatedContent = new GeneratedCodeResponse(
                    planner.Status,
                    planner.Language ?? projectContext.Language ?? "python",
                    planner.Summary,
                    planner.Questions,
                    planner.Plan,
                    null);

                var activeNodes = previousNodes.Where(node => node.IsActive).ToList();

                return new CreateProjectContextResult(
                    contextWasCreated
                        ? CreateProjectContextStatus.Created
                        : CreateProjectContextStatus.Reused,
                    ProjectContextMapper.ToResponse(
                        projectContext,
                        activeNodes,
                        previousRelations,
                        plannerContent,
                        generatedContent));
            }

            var plannerForSummary = plannerResponse;

            if (planner.Status == "needs_clarification" &&
                planner.Nodes.Count == 0 &&
                activePreviousNodes.Count > 0)
            {
                plannerForSummary = plannerResponse with
                {
                    Nodes = activePreviousNodes
                        .Select(node => new PlannerAiNode(
                            node.Key,
                            node.Name,
                            node.Description,
                            node.Kind,
                            node.Role,
                            node.Responsibility,
                            node.Status))
                        .ToList(),
                    Relations = previousRelations
                        .Select(relation => new PlannerAiRelation(
                            previousKeysById[relation.SourceNodeId],
                            previousKeysById[relation.TargetNodeId],
                            relation.Label,
                            relation.Operation,
                            relation.Description,
                            relation.Kind))
                        .ToList()
                };
            }

            var summaryNodeKeys = plannerForSummary.Nodes
                .Select(node => node.Key)
                .ToHashSet(StringComparer.Ordinal);
            var nodeNotes = activePreviousNodes
                .Where(node =>
                    summaryNodeKeys.Contains(node.Key) &&
                    !string.IsNullOrWhiteSpace(node.UserNotes))
                .Select(node => new PlannerNodeNote(node.Key, node.UserNotes))
                .ToList();

            var resumen = await _aiProvider.GenerateResumenAsync(
                projectContext.InitialPrompt,
                projectContext.Resumen,
                currentMessage,
                plannerForSummary,
                nodeNotes,
                cancellationToken);

            var persistedContext = await PersistAsync(
                projectContext,
                planner,
                resumen,
                cancellationToken);

            var nodes = await _dbContext.OrchestrationNodes
                .AsNoTracking()
                .Where(node => node.ContextId == persistedContext.ContextId && node.IsActive)
                .OrderBy(node => node.SortOrder)
                .ThenBy(node => node.Key)
                .ToListAsync(cancellationToken);

            var relations = await _dbContext.OrchestrationRelations
                .AsNoTracking()
                .Where(relation => relation.ContextId == persistedContext.ContextId)
                .OrderBy(relation => relation.SortOrder)
                .ThenBy(relation => relation.RelationId)
                .ToListAsync(cancellationToken);

            return new CreateProjectContextResult(
                contextWasCreated
                    ? CreateProjectContextStatus.Created
                    : CreateProjectContextStatus.Reused,
                ProjectContextMapper.ToResponse(persistedContext, nodes, relations));
        }
        catch (DbUpdateConcurrencyException)
        {
            return new CreateProjectContextResult(
                CreateProjectContextStatus.Conflict,
                ContextId: projectContext.ContextId);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            return new CreateProjectContextResult(
                CreateProjectContextStatus.Conflict,
                ContextId: projectContext.ContextId);
        }
        catch (AiProviderException exception)
        {
            _logger.LogError(
                exception,
                "No se pudo planificar el contexto {ContextId} del proyecto {ProjectId}.",
                projectContext.ContextId,
                projectContext.ProjectId);

            return new CreateProjectContextResult(
                CreateProjectContextStatus.AiProviderFailed,
                ContextId: projectContext.ContextId,
                ErrorMessage: exception.Message);
        }
    }

    public async Task<UpdateNodeNotesResult> UpdateNodeNotesAsync(
        int projectId,
        string nodeKey,
        string userNotes,
        CancellationToken cancellationToken = default)
    {
        var normalizedKey = PlannerResponseNormalizer.Slugify(nodeKey);

        if (string.IsNullOrWhiteSpace(normalizedKey))
        {
            return new UpdateNodeNotesResult(UpdateNodeNotesStatus.NotFound);
        }

        var projectContext = await _dbContext.Contexts
            .SingleOrDefaultAsync(context => context.ProjectId == projectId, cancellationToken);

        if (projectContext is null)
        {
            return new UpdateNodeNotesResult(UpdateNodeNotesStatus.NotFound);
        }

        var node = await _dbContext.OrchestrationNodes
            .SingleOrDefaultAsync(
                candidate =>
                    candidate.ContextId == projectContext.ContextId &&
                    candidate.Key == normalizedKey &&
                    candidate.IsActive,
                cancellationToken);

        if (node is null)
        {
            return new UpdateNodeNotesResult(UpdateNodeNotesStatus.NotFound);
        }

        var trimmedNotes = string.IsNullOrWhiteSpace(userNotes) ? null : userNotes.Trim();

        if (node.UserNotes == trimmedNotes)
        {
            return new UpdateNodeNotesResult(
                UpdateNodeNotesStatus.Updated,
                ProjectContextMapper.ToNodeResponse(node));
        }

        try
        {
            var now = DateTime.UtcNow;
            node.UserNotes = trimmedNotes;
            node.UpdatedAt = now;
            projectContext.UpdatedAt = now;
            projectContext.MapVersion += 1;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new UpdateNodeNotesResult(
                UpdateNodeNotesStatus.Updated,
                ProjectContextMapper.ToNodeResponse(node));
        }
        catch (DbUpdateConcurrencyException)
        {
            return new UpdateNodeNotesResult(UpdateNodeNotesStatus.Conflict);
        }
    }

    private async Task<ProjectContext> PersistAsync(
        ProjectContext projectContext,
        NormalizedPlannerResponse planner,
        string resumen,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        if (_dbContext.Entry(projectContext).State == EntityState.Detached)
        {
            _dbContext.Contexts.Attach(projectContext);
        }

        var now = DateTime.UtcNow;
        var existingNodes = await _dbContext.OrchestrationNodes
            .Where(node => node.ContextId == projectContext.ContextId)
            .ToListAsync(cancellationToken);

        var preserveMap =
            planner.Status == "needs_clarification" &&
            planner.Nodes.Count == 0 &&
            existingNodes.Any(node => node.IsActive);

        if (!preserveMap)
        {
            var nodesByKey = existingNodes.ToDictionary(node => node.Key, StringComparer.Ordinal);
            var activeKeys = new HashSet<string>(StringComparer.Ordinal);

            foreach (var (plannerNode, index) in planner.Nodes.Select((node, index) => (node, index)))
            {
                activeKeys.Add(plannerNode.Key);

                if (!nodesByKey.TryGetValue(plannerNode.Key, out var node))
                {
                    node = new OrchestrationNode
                    {
                        ContextId = projectContext.ContextId,
                        Key = plannerNode.Key,
                        Name = plannerNode.Name,
                        Kind = plannerNode.Kind,
                        Status = plannerNode.Status,
                        CreatedAt = now
                    };

                    _dbContext.OrchestrationNodes.Add(node);
                    nodesByKey[plannerNode.Key] = node;
                }

                node.Name = plannerNode.Name;
                node.Description = plannerNode.Description;
                node.Kind = plannerNode.Kind;
                node.Role = plannerNode.Role;
                node.Responsibility = plannerNode.Responsibility;
                node.Status = plannerNode.Status;
                node.IsActive = true;
                node.SortOrder = index;
                node.UpdatedAt = now;
            }

            foreach (var node in existingNodes)
            {
                if (!activeKeys.Contains(node.Key))
                {
                    node.IsActive = false;
                    node.UpdatedAt = now;
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            var existingRelations = await _dbContext.OrchestrationRelations
                .Where(relation => relation.ContextId == projectContext.ContextId)
                .ToListAsync(cancellationToken);

            var relationsByKey = existingRelations
                .ToDictionary(
                    relation => (relation.SourceNodeId, relation.TargetNodeId, relation.Label));
            var activeRelationKeys = new HashSet<(int, int, string)>();

            foreach (var (plannerRelation, index) in planner.Relations.Select((relation, index) => (relation, index)))
            {
                var source = nodesByKey[plannerRelation.From];
                var target = nodesByKey[plannerRelation.To];
                var relationKey = (source.NodeId, target.NodeId, plannerRelation.Label);
                activeRelationKeys.Add(relationKey);

                if (!relationsByKey.TryGetValue(relationKey, out var relation))
                {
                    relation = new OrchestrationRelation
                    {
                        ContextId = projectContext.ContextId,
                        SourceNodeId = source.NodeId,
                        TargetNodeId = target.NodeId,
                        Label = plannerRelation.Label
                    };

                    _dbContext.OrchestrationRelations.Add(relation);
                    relationsByKey[relationKey] = relation;
                }

                relation.Operation = plannerRelation.Operation;
                relation.Description = plannerRelation.Description;
                relation.Kind = plannerRelation.Kind;
                relation.SortOrder = index;
            }

            foreach (var relation in existingRelations)
            {
                if (!activeRelationKeys.Contains(
                        (relation.SourceNodeId, relation.TargetNodeId, relation.Label)))
                {
                    _dbContext.OrchestrationRelations.Remove(relation);
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        projectContext.Resumen = resumen;
        projectContext.PlannerStatus = planner.Status;
        projectContext.PlannerReply = planner.Reply;
        projectContext.PlannerSummary = planner.Summary;
        projectContext.PlannerPlan = planner.Plan.ToArray();
        projectContext.PlannerQuestions = planner.Questions.ToArray();
        projectContext.PlannerAssumptions = planner.Assumptions.ToArray();
        projectContext.Language = planner.Language ?? projectContext.Language;
        projectContext.MapVersion += 1;
        projectContext.UpdatedAt = now;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return projectContext;
    }
}
