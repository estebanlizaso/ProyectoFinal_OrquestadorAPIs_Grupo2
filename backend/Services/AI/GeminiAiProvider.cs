using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.DTOs;

namespace OrquestadorApi.Services.AI;

public class GeminiAiProvider : IAiProvider
{
    private readonly HttpClient _httpClient;
    private readonly AiOptions _options;
    private readonly IAiRulesProvider _rulesProvider;

    public GeminiAiProvider(
        HttpClient httpClient,
        IOptions<AiOptions> options,
        IAiRulesProvider rulesProvider)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _rulesProvider = rulesProvider;
    }

    public async Task<GeneratedCodeResponse> GenerateContentAsync(
        string prompt,
        CancellationToken cancellationToken = default)
    {
        var path = $"{_options.ApiVersion.Trim('/')}/models/" +
            $"{Uri.EscapeDataString(_options.Model)}:generateContent";

        try
        {
            const int maxAttempts = 3;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, path);
                request.Headers.Add("x-goog-api-key", _options.ApiKey);
                request.Content = JsonContent.Create(new GeminiRequest(
                    new GeminiContent(
                        [new GeminiPart(BuildSystemInstruction(_rulesProvider.RulesJson))]),
                    [new GeminiContent([new GeminiPart(prompt)])],
                    new GeminiGenerationConfig(
                        0.2,
                        "application/json",
                        ResponseJsonSchema)));

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (IsTransient(response.StatusCode) && attempt < maxAttempts)
                {
                    await Task.Delay(TimeSpan.FromSeconds(attempt), cancellationToken);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorPayload = await response.Content.ReadFromJsonAsync<GeminiErrorResponse>(
                        cancellationToken);
                    var errorDetail = string.IsNullOrWhiteSpace(errorPayload?.Error?.Message)
                        ? string.Empty
                        : $" {errorPayload.Error.Message}";

                    throw new AiProviderException(
                        $"Gemini respondió con el código HTTP {(int)response.StatusCode}.{errorDetail}");
                }

                var payload = await response.Content.ReadFromJsonAsync<GeminiResponse>(
                    cancellationToken);
                var generatedContentJson = string.Join(
                    Environment.NewLine,
                    payload?.Candidates?
                        .SelectMany(candidate => candidate.Content?.Parts ?? [])
                        .Select(part => part.Text)
                        .Where(text => !string.IsNullOrWhiteSpace(text)) ?? []);

                if (string.IsNullOrWhiteSpace(generatedContentJson))
                {
                    throw new AiProviderException("Gemini devolvió una respuesta sin contenido.");
                }

                return ParseGeneratedContent(generatedContentJson);
            }

            throw new AiProviderException("Gemini agotó los intentos de generación.");
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new AiProviderException("Gemini excedió el tiempo máximo de respuesta.", exception);
        }
        catch (HttpRequestException exception)
        {
            throw new AiProviderException("No se pudo establecer la conexión con Gemini.", exception);
        }
    }

    private static bool IsTransient(System.Net.HttpStatusCode statusCode)
    {
        var code = (int)statusCode;
        return code == StatusCodes.Status429TooManyRequests || code >= 500;
    }

    private static string BuildSystemInstruction(string rulesJson)
    {
        return "Respeta obligatoriamente las siguientes reglas. " +
            "Devuelve solamente un objeto JSON válido que cumpla el contrato, sin Markdown ni texto adicional." +
            Environment.NewLine + rulesJson;
    }

    private static GeneratedCodeResponse ParseGeneratedContent(string generatedContentJson)
    {
        GeneratedCodeResponse? generatedContent;

        try
        {
            generatedContent = JsonSerializer.Deserialize<GeneratedCodeResponse>(
                generatedContentJson,
                JsonSerializerOptions.Web);
        }
        catch (JsonException exception)
        {
            throw new AiProviderException(
                "Gemini devolvió contenido que no es un JSON válido.",
                exception);
        }

        if (generatedContent is null ||
            string.IsNullOrWhiteSpace(generatedContent.Status) ||
            string.IsNullOrWhiteSpace(generatedContent.Language) ||
            string.IsNullOrWhiteSpace(generatedContent.Summary) ||
            generatedContent.Questions is null ||
            generatedContent.Plan is null)
        {
            throw new AiProviderException("Gemini devolvió un contrato de respuesta incompleto.");
        }

        if (generatedContent.Status == "needs_clarification")
        {
            if (generatedContent.Questions.Count == 0 || generatedContent.Code is not null)
            {
                throw new AiProviderException(
                    "Gemini devolvió un estado needs_clarification inválido.");
            }

            return generatedContent;
        }

        if (generatedContent.Status == "ready")
        {
            if (generatedContent.Questions.Count > 0 ||
                generatedContent.Plan.Count == 0 ||
                string.IsNullOrWhiteSpace(generatedContent.Code))
            {
                throw new AiProviderException("Gemini devolvió un estado ready inválido.");
            }

            return generatedContent;
        }

        throw new AiProviderException(
            $"Gemini devolvió el estado desconocido '{generatedContent.Status}'.");
    }

    private static readonly object ResponseJsonSchema = new
    {
        type = "object",
        additionalProperties = false,
        properties = new
        {
            status = new
            {
                type = "string",
                @enum = new[] { "needs_clarification", "ready" }
            },
            language = new { type = "string" },
            summary = new { type = "string" },
            questions = new
            {
                type = "array",
                items = new { type = "string" }
            },
            plan = new
            {
                type = "array",
                items = new { type = "string" }
            },
            code = new
            {
                type = "string",
                nullable = true
            }
        },
        required = new[] { "status", "language", "summary", "questions", "plan", "code" }
    };

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

    private sealed record GeminiErrorResponse(
        [property: JsonPropertyName("error")] GeminiError? Error);

    private sealed record GeminiError(
        [property: JsonPropertyName("message")] string? Message);
}
