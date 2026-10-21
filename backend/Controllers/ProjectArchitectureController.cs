using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.Architecture;

namespace OrquestadorApi.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/architecture")]
public class ProjectArchitectureController : ControllerBase
{
    private readonly IArchitectureService _architectureService;

    public ProjectArchitectureController(IArchitectureService architectureService)
    {
        _architectureService = architectureService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ArchitectureResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ArchitectureGenerationErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<ArchitectureResponse>> Generate(
        [FromRoute] int projectId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] GenerateArchitectureRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _architectureService.GenerateAsync(
            projectId,
            request?.Language,
            cancellationToken);

        return result.Status switch
        {
            GenerateArchitectureStatus.Success => Ok(result.Response),
            GenerateArchitectureStatus.NotFound => NotFound(),
            GenerateArchitectureStatus.NoDetectedContexts => Conflict(new
            {
                message = result.Message
            }),
            GenerateArchitectureStatus.TooManyContexts => UnprocessableEntity(new
            {
                message = result.Message
            }),
            GenerateArchitectureStatus.LimitExceeded => UnprocessableEntity(new
            {
                message = result.Message
            }),
            GenerateArchitectureStatus.InvalidLanguage => BadRequest(new
            {
                message = result.Message
            }),
            GenerateArchitectureStatus.AiProviderFailed => StatusCode(
                StatusCodes.Status502BadGateway,
                new ArchitectureGenerationErrorResponse(
                    result.Message ?? "No se pudo generar la arquitectura.")),
            _ => throw new InvalidOperationException("Estado de generación de arquitectura desconocido.")
        };
    }
}
