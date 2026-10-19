using Microsoft.AspNetCore.Mvc;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.Contexts;

namespace OrquestadorApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/context")]
public class ProjectContextsController : ControllerBase
{
    private readonly IProjectContextService _projectContextService;

    public ProjectContextsController(IProjectContextService projectContextService)
    {
        _projectContextService = projectContextService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProjectContextResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProjectContextResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProjectContextGenerationErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<ProjectContextResponse>> Create(
        [FromRoute] int projectId,
        [FromBody] CreateProjectContextRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _projectContextService.CreateAsync(
            projectId,
            request.Prompt,
            cancellationToken);

        return result.Status switch
        {
            CreateProjectContextStatus.Created => StatusCode(
                StatusCodes.Status201Created,
                result.Context),
            CreateProjectContextStatus.Reused => Ok(result.Context),
            CreateProjectContextStatus.ProjectNotFound => NotFound(),
            CreateProjectContextStatus.Conflict => Conflict(new
            {
                message = "El contexto cambió durante la generación. Reenviá el mensaje para usar la memoria actualizada."
            }),
            CreateProjectContextStatus.AiProviderFailed => StatusCode(
                StatusCodes.Status502BadGateway,
                new ProjectContextGenerationErrorResponse(
                    result.ContextId!.Value,
                    "No se pudo completar la respuesta o actualizar el resumen con Gemini. La memoria anterior se conserva; reenviá el mensaje para reintentar.")),
            _ => throw new InvalidOperationException("Estado de creación de contexto desconocido.")
        };
    }
}
