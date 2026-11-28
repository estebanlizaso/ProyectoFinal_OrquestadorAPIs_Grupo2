using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.AI.Contracts;

public sealed record ArchitectureAiResponse(
    string Language,
    string Summary,
    IReadOnlyList<ArchitectureAiContext> Contexts,
    IReadOnlyList<ArchitectureProjectFile>? ProjectFiles = null,
    IReadOnlyList<ArchitecturePublicEndpoint>? PublicEndpoints = null);

public sealed record ArchitectureAiContext(
    string Key,
    string Summary,
    string FilePath,
    IReadOnlyList<string> Dependencies,
    IReadOnlyList<ArchitectureAiEnvVar> Env,
    IReadOnlyList<string> Assumptions,
    IReadOnlyList<string> Warnings);

public sealed record ArchitectureAiEnvVar(
    string Name,
    string? Example,
    string? Description);
