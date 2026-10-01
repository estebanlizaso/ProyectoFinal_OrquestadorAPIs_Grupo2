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

    [HttpGet]
    [ProducesResponseType(typeof(ProjectsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProjectsResponse>> GetAll(CancellationToken cancellationToken)
    {
        var projects = await _projectService.GetAllAsync(cancellationToken);

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
