using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class CreateProjectRequest
{
    [Required]
    public required string Name { get; set; }
}
