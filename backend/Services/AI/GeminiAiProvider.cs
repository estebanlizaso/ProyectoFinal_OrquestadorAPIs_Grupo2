using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;

namespace OrquestadorApi.Services.AI;

public class GeminiAiProvider : AiProviderBase
{
    private readonly GeminiOptions _gemini;

    public GeminiAiProvider(
        HttpClient httpClient,
        IOptions<AiOptions> options,
        IAiRulesProvider rulesProvider)
        : base(httpClient, options.Value, rulesProvider)
    {
        _gemini = options.Value.Gemini;
    }

    public override string ProviderName => "Gemini";

    protected override HttpRequestMessage BuildRequest(
        string prompt,
        string systemInstruction,
        object responseSchema)
    {
        var path = $"{_gemini.ApiVersion.Trim('/')}/models/" +
            $"{Uri.EscapeDataString(_gemini.Model)}:generateContent";

        var request = new HttpRequestMessage(HttpMethod.Post, path);
        request.Headers.Add("x-goog-api-key", _gemini.ApiKey);

        var geminiRequest = new GeminiRequest(
            new GeminiContent([new GeminiPart(systemInstruction)]),
            [new GeminiContent([new GeminiPart(prompt)])],
            new GeminiGenerationConfig(0.2, "application/json", responseSchema));

        request.Content = new StringContent(
            JsonSerializer.Serialize(geminiRequest, JsonSerializerOptions.Web),
            Encoding.UTF8,
            "application/json");

        return request;
    }

    protected override string? ExtractContent(string responseBody)
    {
        var payload = JsonSerializer.Deserialize<GeminiResponse>(
            responseBody,
            JsonSerializerOptions.Web);

        return string.Join(
            Environment.NewLine,
            payload?.Candidates?
                .SelectMany(candidate => candidate.Content?.Parts ?? [])
                .Select(part => part.Text)
                .Where(text => !string.IsNullOrWhiteSpace(text)) ?? []);
    }

    private sealed record GeminiRequest(
        [property: JsonPropertyName("systemInstruction")] GeminiContent SystemInstruction,
        [property: JsonPropertyName("contents")] IReadOnlyList<GeminiContent> Contents,
        [property: JsonPropertyName("generationConfig")] GeminiGenerationConfig GenerationConfig);

    private sealed record GeminiGenerationConfig(
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("responseMimeType")] string ResponseMimeType,
        [property: JsonPropertyName("responseJsonSchema")] object ResponseJsonSchema);

    private sealed record GeminiContent(
        [property: JsonPropertyName("parts")] IReadOnlyList<GeminiPart> Parts);

    private sealed record GeminiPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record GeminiResponse(
        [property: JsonPropertyName("candidates")] IReadOnlyList<GeminiCandidate>? Candidates);

    private sealed record GeminiCandidate(
        [property: JsonPropertyName("content")] GeminiContent? Content);
}
