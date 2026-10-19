using System.Text.Json;

namespace OrquestadorApi.Services.AI;

public class JsonAiRulesProvider : IAiRulesProvider
{
    public JsonAiRulesProvider(IHostEnvironment environment)
    {
        RulesJson = LoadRules(environment, "AI/Rules/code-generator.rules.json");
        SummaryRulesJson = LoadRules(environment, "AI/Rules/context-summary.rules.json");
    }

    private static string LoadRules(IHostEnvironment environment, string relativePath)
    {
        var rulesPath = Path.Combine(
            environment.ContentRootPath,
            relativePath.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(rulesPath))
        {
            throw new InvalidOperationException(
                $"No se encontró el archivo de reglas de IA '{rulesPath}'.");
        }

        var rulesJson = File.ReadAllText(rulesPath);

        try
        {
            using var _ = JsonDocument.Parse(rulesJson);
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException(
                $"El archivo de reglas de IA '{rulesPath}' no contiene JSON válido.",
                exception);
        }
        return rulesJson;
    }

    public string RulesJson { get; }
    public string SummaryRulesJson { get; }
}
