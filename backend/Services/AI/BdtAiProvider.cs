using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;

namespace OrquestadorApi.Services.AI;

// Proveedor BDT: API compatible con OpenAI (POST {BaseUrl}/chat/completions).
public class BdtAiProvider : AiProviderBase
{
    private readonly BdtOptions _bdt;
    private readonly string _model;

    public BdtAiProvider(
        HttpClient httpClient,
        IOptions<AiOptions> options,
        IAiRulesProvider rulesProvider,
        string? model = null)
        : base(httpClient, options.Value, rulesProvider)
    {
        _bdt = options.Value.Bdt;
        _model = model ?? _bdt.Model;
    }

    public override string ProviderName => "BDT";

    protected override HttpRequestMessage BuildRequest(
        string prompt,
        string systemInstruction,
        object responseSchema)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        request.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _bdt.ApiKey);

        object responseFormat = _bdt.ResponseFormat == BdtOptions.JsonObjectFormat
            ? new { type = BdtOptions.JsonObjectFormat }
            : new
            {
                type = BdtOptions.JsonSchemaFormat,
                json_schema = new
                {
                    name = "response",
                    strict = true,
                    schema = ToStandardJsonSchema(responseSchema)
                }
            };

        var body = new BdtRequest(
            _model,
            [new BdtMessage("system", systemInstruction), new BdtMessage("user", prompt)],
            0.2,
            responseFormat,
            _bdt.MaxTokens);

        request.Content = new StringContent(
            JsonSerializer.Serialize(body, JsonSerializerOptions.Web),
            Encoding.UTF8,
            "application/json");

        return request;
    }

    protected override string? ExtractContent(string responseBody)
    {
        var payload = JsonSerializer.Deserialize<BdtResponse>(
            responseBody,
            JsonSerializerOptions.Web);

        var choice = payload?.Choices?.FirstOrDefault();
        var content = StripMarkdownFence(choice?.Message?.Content);

        if (string.IsNullOrWhiteSpace(content) && choice?.FinishReason == "length")
        {
            throw new AiProviderException(
                "BDT agotó el límite de tokens antes de generar la respuesta. " +
                "Aumentá AI:Bdt:MaxTokens o usá un modelo más rápido.");
        }

        return content;
    }

    // El esquema base usa la extensión "nullable" de Gemini; JSON Schema estándar usa type: [t, "null"].
    private static JsonNode ToStandardJsonSchema(object schema)
    {
        var node = JsonSerializer.SerializeToNode(schema, JsonSerializerOptions.Web)!;
        NormalizeNullable(node);
        return node;
    }

    private static void NormalizeNullable(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                if (obj.Remove("nullable", out var nullable) &&
                    nullable is JsonValue flag &&
                    flag.TryGetValue<bool>(out var isNullable) &&
                    isNullable &&
                    obj["type"] is JsonValue type &&
                    type.TryGetValue<string>(out var typeName))
                {
                    obj["type"] = new JsonArray(typeName, "null");
                }

                foreach (var child in obj.Select(property => property.Value).ToList())
                {
                    NormalizeNullable(child);
                }

                break;
            case JsonArray array:
                foreach (var child in array)
                {
                    NormalizeNullable(child);
                }

                break;
        }
    }

    // Algunos modelos envuelven el JSON en ```json ... ``` aunque se les pida solo JSON.
    public static string? StripMarkdownFence(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return content;
        }

        var trimmed = content.Trim();

        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstLineEnd = trimmed.IndexOf('\n');
        var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);

        if (firstLineEnd < 0 || lastFence <= firstLineEnd)
        {
            return trimmed;
        }

        return trimmed[(firstLineEnd + 1)..lastFence].Trim();
    }

    private sealed record BdtRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] IReadOnlyList<BdtMessage> Messages,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("response_format")] object ResponseFormat,
        [property: JsonPropertyName("max_tokens")]
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? MaxTokens);

    private sealed record BdtMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string? Content);

    private sealed record BdtResponse(
        [property: JsonPropertyName("choices")] IReadOnlyList<BdtChoice>? Choices);

    private sealed record BdtChoice(
        [property: JsonPropertyName("message")] BdtMessage? Message,
        [property: JsonPropertyName("finish_reason")] string? FinishReason);
}
