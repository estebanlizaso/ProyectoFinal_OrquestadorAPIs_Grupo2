namespace OrquestadorApi.Services.AI.Contracts;

public sealed record ArchitectureAiResponse(
    string Language,
    string Summary,
    IReadOnlyList<ArchitectureAiContext> Contexts);

public sealed record ArchitectureAiContext(
    string Key,
    string Summary,
    string Code,
    IReadOnlyList<string> Dependencies,
    IReadOnlyList<ArchitectureAiEnvVar> Env,
    IReadOnlyList<string> Assumptions,
    IReadOnlyList<string> Warnings);

public sealed record ArchitectureAiEnvVar(
    string Name,
    string? Example,
    string? Description);
