using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.Configuration;

public class AiOptions
{
    public const string SectionName = "AI";

    [Required]
    public required string BaseUrl { get; set; }

    [Required]
    public required string ApiVersion { get; set; }

    [Required]
    public required string Model { get; set; }

    [Required]
    public required string ApiKey { get; set; }

    [Range(1, 300)]
    public int TimeoutSeconds { get; set; } = 60;
}
