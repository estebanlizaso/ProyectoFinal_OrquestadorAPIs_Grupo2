using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.AI.Contracts;

namespace OrquestadorApi.Tests;

internal static class TestRepositoryPlans
{
    public static PlannerAiResponse SimplePlan() => new("ready", "ok", "Flujo mock", [],
        ["Consultar"], [], "python",
        [new("source", "Source", null, "system", "consumer", null, "confirmed"),
         new("target", "Target", null, "system", "provider", null, "confirmed")],
        [new("source", "target", "consulta", null, null, "sync")]);

    public static string SimplePlanJson => System.Text.Json.JsonSerializer.Serialize(SimplePlan(),
        System.Text.Json.JsonSerializerOptions.Web);

    public sealed class NoopSelection : IAiSelectionService
    {
        public AiModelsResponse GetModels() => throw new NotSupportedException();
        public string? Select(AiSelectionRequest? selection) => null;
    }
}
