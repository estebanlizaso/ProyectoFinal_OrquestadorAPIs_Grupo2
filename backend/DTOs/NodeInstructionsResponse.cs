namespace OrquestadorApi.DTOs;

public record NodeInstructionsResponse(
    OrchestrationNodeResponse Node,
    OrchestrationRelationResponse? Relation,
    int MapVersion);
