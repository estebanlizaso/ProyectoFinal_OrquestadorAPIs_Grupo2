using System.Text.Json;

namespace OrquestadorApi.DTOs;

public record ProjectMessageResponse(
    long Id,
    int ProjectId,
    string HumanQuestion,
    JsonElement ChatBot,
    DateTime CreatedAt);
