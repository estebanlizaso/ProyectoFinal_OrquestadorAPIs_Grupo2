using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.Contexts;

namespace OrquestadorApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/messages")]
public class ProjectMessagesController(IProjectContextService projectContextService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProjectMessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ProjectMessageResponse>>> Get(
        [FromRoute] int projectId,
        CancellationToken cancellationToken,
        [FromQuery, Range(0, int.MaxValue)] int offset = 0,
        [FromQuery, Range(1, 200)] int limit = 50)
    {
        var messages = await projectContextService.GetMessagesAsync(projectId, offset, limit, cancellationToken);
        return messages is null ? NotFound() : Ok(messages);
    }
}
