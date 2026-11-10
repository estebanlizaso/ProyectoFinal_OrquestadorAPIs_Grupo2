using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class CreateProjectContextRequest
{
    [Required]
    public required string Prompt { get; set; }
}
