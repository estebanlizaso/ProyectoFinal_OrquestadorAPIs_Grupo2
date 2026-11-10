namespace OrquestadorApi.Services.AI.Contracts;

public sealed record PlannerAiResponse(
    string Status,
    string Reply,
    string Summary,
    IReadOnlyList<string> Questions,
    IReadOnlyList<string> Plan,
    IReadOnlyList<string> Assumptions,
    string? Language,
    IReadOnlyList<PlannerAiNode> Nodes,
    IReadOnlyList<PlannerAiRelation> Relations);

public sealed record PlannerAiNode(
    string Key,
    string Name,
    string? Description,
    string Kind,
    string? Role,
    string? Responsibility,
    string Status);

public sealed record PlannerAiRelation(
    string From,
    string To,
    string Label,
    string? Operation,
    string? Description,
    string? Kind);

public sealed record PlannerNodeNote(
    string Key,
    string? UserNotes);
