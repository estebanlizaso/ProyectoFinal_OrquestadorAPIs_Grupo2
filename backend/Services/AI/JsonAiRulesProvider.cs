using System.Text.Json;

namespace OrquestadorApi.Services.AI;

public class JsonAiRulesProvider : IAiRulesProvider
{
    private const string RulesRelativePath = "AI/Rules/code-generator.rules.json";

    public JsonAiRulesProvider(IHostEnvironment environment)
    {
        var rulesPath = Path.Combine(
            environment.ContentRootPath,
            RulesRelativePath.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(rulesPath))
        {
            throw new InvalidOperationException(
                $"No se encontró el archivo de reglas de IA '{rulesPath}'.");
        }

        RulesJson = File.ReadAllText(rulesPath);

        try
        {
            using var _ = JsonDocument.Parse(RulesJson);
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException(
                $"El archivo de reglas de IA '{rulesPath}' no contiene JSON válido.",
                exception);
        }
    }

    public string RulesJson { get; }
}
