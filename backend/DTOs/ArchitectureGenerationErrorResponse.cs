using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ArchitectureGenerationErrorResponse(
    [property: JsonPropertyName("message")] string Message);
