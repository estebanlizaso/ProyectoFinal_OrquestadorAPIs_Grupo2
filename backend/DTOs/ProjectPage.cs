namespace OrquestadorApi.DTOs;

public record ProjectPage(IReadOnlyList<ProjectResponse> Projects, bool HasNextPage);
