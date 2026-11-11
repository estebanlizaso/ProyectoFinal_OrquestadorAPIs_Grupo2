using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.Configuration;

public class AiOptions
{
    public const string SectionName = "AI";
    public const string GeminiProvider = "Gemini";
    public const string BdtProvider = "Bdt";

    public string Provider { get; set; } = GeminiProvider;

    public GeminiOptions Gemini { get; set; } = new();

    public BdtOptions Bdt { get; set; } = new();

    [Range(1, 300)]
    public int TimeoutSeconds { get; set; } = 60;

    [Range(1, 600)]
    public int ArchitectureTimeoutSeconds { get; set; } = 120;

    public bool IsGemini =>
        string.Equals(Provider, GeminiProvider, StringComparison.OrdinalIgnoreCase);

    public bool IsBdt =>
        string.Equals(Provider, BdtProvider, StringComparison.OrdinalIgnoreCase);
}

public class GeminiOptions
{
    public string BaseUrl { get; set; } = string.Empty;

    public string ApiVersion { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;
}

public class BdtOptions
{
    public const string JsonSchemaFormat = "json_schema";
    public const string JsonObjectFormat = "json_object";

    public string BaseUrl { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    // json_schema envía el contrato al modelo; json_object solo exige JSON válido.
    public string ResponseFormat { get; set; } = JsonSchemaFormat;

    // Null deja el límite al servidor: los modelos de razonamiento gastan tokens pensando.
    public int? MaxTokens { get; set; }
}
