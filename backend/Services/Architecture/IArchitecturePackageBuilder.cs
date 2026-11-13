using System.Text.Json;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public interface IArchitecturePackageBuilder
{
    byte[] BuildZip(
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations,
        JsonElement? postmanCollection = null);

    string BuildFileName();

    string BuildProjectFolderName(string projectName);

    string BuildSourceFileName(string contextKey, string language);

    string ResolveSourceMimeType(string language);
}
