using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
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
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProjectsResponse>> GetAll(
    [FromQuery] string? search,
    CancellationToken cancellationToken,
    [FromQuery, Range(1, int.MaxValue)] int page = 1)
    {
        if ((long)page * PaginationSettings.PageSize > int.MaxValue)
        {
            ModelState.AddModelError(nameof(page), "El número de página solicitado es demasiado grande.");
            return ValidationProblem(ModelState);
        }

        var result = await _projectService.GetAllAsync(search, page, cancellationToken);

        string? PageLink(int targetPage) => Url.Action(
            nameof(GetAll), "Projects", new { page = targetPage, search }, Request.Scheme);

        return Ok(new ProjectsResponse(
            result.Projects,
            result.HasNextPage ? PageLink(page + 1) : null,
            page > 1 ? PageLink(page - 1) : null));
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
