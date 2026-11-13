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
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
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
            GenerateArchitectureStatus.DriveDisabled => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ArchitectureGenerationErrorResponse(
                    result.Message ?? "Google Drive no está configurado.")),
            GenerateArchitectureStatus.DriveFailed => StatusCode(
                StatusCodes.Status502BadGateway,
                new ArchitectureGenerationErrorResponse(
                    result.Message ?? "No se pudo subir el paquete a Google Drive.")),
            _ => throw new InvalidOperationException("Estado de generación de arquitectura desconocido.")
        };
    }

    [HttpGet("package")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> DownloadPackage(
        [FromRoute] int projectId,
        CancellationToken cancellationToken)
    {
        var result = await _architectureService.DownloadPackageAsync(projectId, cancellationToken);
        return ToDownloadResult(result);
    }

    [HttpGet("postman-collection")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> DownloadPostmanCollection(
        [FromRoute] int projectId,
        CancellationToken cancellationToken)
    {
        var result = await _architectureService.DownloadPostmanCollectionAsync(
            projectId,
            cancellationToken);

        return ToDownloadResult(result);
    }

    private IActionResult ToDownloadResult(DownloadArchitectureArtifactResult result)
    {
        return result.Status switch
        {
            DownloadArchitectureStatus.Success => File(
                result.Content!,
                result.ContentType!,
                result.FileName),
            DownloadArchitectureStatus.NotFound => NotFound(new
            {
                message = result.Message ?? "No se encontró el artefacto solicitado."
            }),
            DownloadArchitectureStatus.DriveDisabled => StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = result.Message }),
            DownloadArchitectureStatus.DriveFailed => StatusCode(
                StatusCodes.Status502BadGateway,
                new { message = result.Message }),
            _ => throw new InvalidOperationException("Estado de descarga de arquitectura desconocido.")
        };
    }
}
