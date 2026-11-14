using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.AI;

public interface IAiSelectionService
{
    AiModelsResponse GetModels();
    string? Select(AiSelectionRequest? selection);
}
