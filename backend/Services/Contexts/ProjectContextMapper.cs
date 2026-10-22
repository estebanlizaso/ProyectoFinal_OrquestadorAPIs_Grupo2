using OrquestadorApi.DTOs;
using OrquestadorApi.Models;

namespace OrquestadorApi.Services.Contexts;

public static class ProjectContextMapper
{
    public static ProjectContextResponse ToResponse(
        ProjectContext context,
        IReadOnlyList<OrchestrationNode> activeNodes,
        IReadOnlyList<OrchestrationRelation> relations)
    {
        var planner = ToPlannerContent(context);
        var generatedContent = ToGeneratedContent(context, planner);

        return BuildResponse(context, activeNodes, relations, planner, generatedContent);
    }

    public static ProjectContextResponse ToResponse(
        ProjectContext context,
        IReadOnlyList<OrchestrationNode> activeNodes,
        IReadOnlyList<OrchestrationRelation> relations,
        PlannerContentResponse planner,
        GeneratedCodeResponse generatedContent)
    {
        return BuildResponse(context, activeNodes, relations, planner, generatedContent);
    }

    public static OrchestrationNodeResponse ToNodeResponse(OrchestrationNode node)
    {
        return new OrchestrationNodeResponse(
            node.NodeId,
            node.Key,
            node.Name,
            node.Description,
            node.Kind,
            node.Role,
            node.Responsibility,
            node.Status,
            node.UserNotes,
            node.IsActive,
            node.SortOrder);
    }

    private static ProjectContextResponse BuildResponse(
        ProjectContext context,
        IReadOnlyList<OrchestrationNode> activeNodes,
        IReadOnlyList<OrchestrationRelation> relations,
        PlannerContentResponse? planner,
        GeneratedCodeResponse? generatedContent)
    {
        var orderedNodes = activeNodes
            .Where(node => node.IsActive)
            .OrderBy(node => node.SortOrder)
            .ThenBy(node => node.Key, StringComparer.Ordinal)
            .ToList();

        var keyById = orderedNodes.ToDictionary(node => node.NodeId, node => node.Key);
        var nodeResponses = orderedNodes.Select(ToNodeResponse).ToList();

        var relationResponses = relations
            .Where(relation =>
                keyById.ContainsKey(relation.SourceNodeId) &&
                keyById.ContainsKey(relation.TargetNodeId))
            .OrderBy(relation => relation.SortOrder)
            .ThenBy(relation => relation.RelationId)
            .Select(relation => new OrchestrationRelationResponse(
                relation.RelationId,
                keyById[relation.SourceNodeId],
                keyById[relation.TargetNodeId],
                relation.Label,
                relation.Operation,
                relation.Description,
                relation.Kind,
                relation.SortOrder))
            .ToList();

        return new ProjectContextResponse(
            context.ContextId,
            context.ProjectId,
            context.InitialPrompt,
            generatedContent,
            planner,
            nodeResponses,
            relationResponses,
            context.MapVersion,
            context.Resumen,
            context.UpdatedAt);
    }

    public static PlannerContentResponse? ToPlannerContent(ProjectContext context)
    {
        if (string.IsNullOrWhiteSpace(context.PlannerStatus))
        {
            return null;
        }

        return new PlannerContentResponse(
            context.PlannerStatus,
            context.PlannerReply ?? string.Empty,
            context.PlannerSummary ?? string.Empty,
            context.PlannerQuestions ?? [],
            context.PlannerPlan ?? [],
            context.PlannerAssumptions ?? [],
            context.Language);
    }

    public static GeneratedCodeResponse? ToGeneratedContent(
        ProjectContext context,
        PlannerContentResponse? planner)
    {
        if (planner is null)
        {
            return null;
        }

        return new GeneratedCodeResponse(
            planner.Status,
            planner.Language ?? context.Language ?? "python",
            planner.Summary,
            planner.Questions,
            planner.Plan,
            null);
    }
}
