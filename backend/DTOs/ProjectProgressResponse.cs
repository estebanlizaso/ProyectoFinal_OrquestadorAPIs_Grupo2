using System.Text.Json.Serialization;

namespace OrquestadorApi.DTOs;

public record ProjectProgressResponse(
    string Stage,
    [property: JsonPropertyName("finish_proyect")] bool FinishProyect);
