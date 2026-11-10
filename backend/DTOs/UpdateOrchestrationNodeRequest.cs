using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class UpdateOrchestrationNodeRequest
{
    [MaxLength(2000)]
    public string UserNotes { get; set; } = string.Empty;
}
