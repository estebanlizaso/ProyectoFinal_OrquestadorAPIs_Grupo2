namespace OrquestadorApi.DTOs;

public class GenerateArchitectureRequest
{
    public string? Language { get; set; }

    public AiSelectionRequest? AiSelection { get; set; }
}
