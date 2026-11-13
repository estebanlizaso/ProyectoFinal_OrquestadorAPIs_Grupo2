using Microsoft.AspNetCore.Mvc;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;

namespace OrquestadorApi.Controllers;

[ApiController]
[Route("api/ai/models")]
public sealed class AiModelsController(IAiSelectionService selectionService) : ControllerBase
{
    /// <summary>Lista los proveedores de IA configurados y sus modelos.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(AiModelsResponse), StatusCodes.Status200OK)]
    public ActionResult<AiModelsResponse> Get() => Ok(selectionService.GetModels());
}
