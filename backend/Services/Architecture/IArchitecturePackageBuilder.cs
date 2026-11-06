using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.Architecture;

public interface IArchitecturePackageBuilder
{
    byte[] BuildZip(
        ArchitectureResponse architecture,
        IReadOnlyList<OrchestrationNodeResponse> nodes,
        IReadOnlyList<OrchestrationRelationResponse> relations);

    string BuildFileName(int projectId);
}
