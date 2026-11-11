using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.DTOs;

public class UpdateProjectProgressRequest
{
    [Required]
    [RegularExpression("\\A(context|architecture|generation)\\z",
        ErrorMessage = "La etapa debe ser 'context', 'architecture' o 'generation'.")]
    public required string Stage { get; set; }
}
