using Microsoft.AspNetCore.Mvc;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services;

namespace OrquestadorApi.Controllers;

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectResponse>> Create(
        [FromBody] CreateProjectRequest request,
        CancellationToken cancellationToken)
    {
        var project = await _projectService.CreateAsync(request.Name, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, project);
    }

    [HttpGet]
    [ProducesResponseType(typeof(ProjectsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProjectsResponse>> GetAll(
    [FromQuery] string? search,
    CancellationToken cancellationToken)
    {
        var projects = await _projectService.GetAllAsync(search, cancellationToken);

        return Ok(new ProjectsResponse(projects));
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        [FromBody] DeleteProjectRequest request,
        CancellationToken cancellationToken)
    {
        var deleted = await _projectService.DeleteAsync(request.ProjectId, cancellationToken);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
