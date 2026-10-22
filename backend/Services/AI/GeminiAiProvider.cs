using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Services.AI.Contracts;

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

    public async Task<PlannerAiResponse> GeneratePlanAsync(
        string agentInput,
        CancellationToken cancellationToken = default)
    {
        var json = await SendAsync(
            agentInput,
            BuildSystemInstruction(_rulesProvider.PlannerRulesJson),
            PlannerResponseJsonSchema,
            TimeSpan.FromSeconds(_options.TimeoutSeconds),
            cancellationToken);

        return ParsePlannerResponse(json);
    }

    public async Task<string> GenerateResumenAsync(
        string initialPrompt,
        string? previousResumen,
        string userMessage,
        PlannerAiResponse response,
        IReadOnlyList<PlannerNodeNote> nodeNotes,
        CancellationToken cancellationToken = default)
    {
        var input = JsonSerializer.Serialize(
            new { initialPrompt, previousResumen, userMessage, response, nodeNotes },
            JsonSerializerOptions.Web);

        var json = await SendAsync(
            input,
            BuildSystemInstruction(_rulesProvider.SummaryRulesJson),
            new
            {
                type = "object",
                additionalProperties = false,
                properties = new { resumen = new { type = "string" } },
                required = new[] { "resumen" }
            },
            TimeSpan.FromSeconds(_options.TimeoutSeconds),
            cancellationToken);

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("resumen", out var value) &&
                value.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(value.GetString()))
            {
                return value.GetString()!.Trim();
            }
        }
        catch (JsonException exception)
        {
            throw new AiProviderException("Gemini devolvió un resumen inválido.", exception);
        }

        throw new AiProviderException("Gemini devolvió un resumen vacío o inválido.");
    }

    public async Task<ArchitectureAiResponse> GenerateArchitectureAsync(
        string agentInput,
        CancellationToken cancellationToken = default)
    {
        var json = await SendAsync(
            agentInput,
            BuildSystemInstruction(_rulesProvider.RulesJson),
            ArchitectureResponseJsonSchema,
            TimeSpan.FromSeconds(_options.ArchitectureTimeoutSeconds),
            cancellationToken);

        return ParseArchitectureResponse(json);
    }

    private async Task<string> SendAsync(
        string prompt,
        string systemInstruction,
        object responseSchema,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);
        var requestToken = timeoutSource.Token;

        var path = $"{_options.ApiVersion.Trim('/')}/models/" +
            $"{Uri.EscapeDataString(_options.Model)}:generateContent";

        try
        {
            const int maxAttempts = 3;

            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, path);
                request.Headers.Add("x-goog-api-key", _options.ApiKey);
                var geminiRequest = new GeminiRequest(
                    new GeminiContent(
                        [new GeminiPart(systemInstruction)]),
                    [new GeminiContent([new GeminiPart(prompt)])],
                    new GeminiGenerationConfig(
                        0.2,
                        "application/json",
                        responseSchema));

                request.Content = new StringContent(
                    JsonSerializer.Serialize(geminiRequest, JsonSerializerOptions.Web),
                    Encoding.UTF8,
                    "application/json");

                using var response = await _httpClient.SendAsync(request, requestToken);

                if (IsTransient(response.StatusCode) && attempt < maxAttempts)
                {
                    await Task.Delay(TimeSpan.FromSeconds(attempt), requestToken);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(requestToken);
                    var errorDetail = TryGetGeminiErrorMessage(errorBody);

                    throw new AiProviderException(
                        BuildProviderErrorMessage(response.StatusCode, errorDetail));
                }

                var responseBody = await response.Content.ReadAsStringAsync(requestToken);
                GeminiResponse? payload;

                try
                {
                    payload = JsonSerializer.Deserialize<GeminiResponse>(
                        responseBody,
                        JsonSerializerOptions.Web);
                }
                catch (JsonException exception)
                {
                    throw new AiProviderException(
                        "Gemini devolvió una respuesta HTTP que no es JSON válido.",
                        exception);
                }

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

                return generatedContentJson;
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

    private static string? TryGetGeminiErrorMessage(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);

            if (document.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message) &&
                message.ValueKind == JsonValueKind.String)
            {
                return message.GetString()?.Trim();
            }
        }
        catch (JsonException)
        {
        }

        return null;
    }

    private static string BuildProviderErrorMessage(
        System.Net.HttpStatusCode statusCode,
        string? errorDetail)
    {
        if (statusCode == System.Net.HttpStatusCode.TooManyRequests ||
            ContainsAny(
                errorDetail,
                "rate limit",
                "quota",
                "resource_exhausted",
                "too many requests"))
        {
            return "Gemini alcanzó el rate limit o la cuota de solicitudes. " +
                "Esperá unos segundos y volvé a intentar.";
        }

        if (statusCode == System.Net.HttpStatusCode.RequestEntityTooLarge ||
            ContainsAny(
                errorDetail,
                "too long",
                "too large",
                "exceeds the maximum",
                "maximum number of tokens",
                "token count",
                "payload size",
                "input size",
                "context length",
                "input token"))
        {
            return "El mensaje es demasiado largo y supera el límite de contexto " +
                "del modelo de Gemini. Acortá el mensaje o dividí el pedido en partes.";
        }

        var detail = string.IsNullOrWhiteSpace(errorDetail)
            ? string.Empty
            : $" Detalle: {Truncate(errorDetail.Trim(), 300)}";

        return $"Gemini respondió con HTTP {(int)statusCode}. " +
            $"Volvé a intentar en unos segundos.{detail}";
    }

    private static bool ContainsAny(string? value, params string[] terms)
    {
        return !string.IsNullOrWhiteSpace(value) &&
            terms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));
    }

    private static string Truncate(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength] + "...";
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

    private static PlannerAiResponse ParsePlannerResponse(string generatedContentJson)
    {
        PlannerAiResponse? response;

        try
        {
            response = JsonSerializer.Deserialize<PlannerAiResponse>(
                generatedContentJson,
                JsonSerializerOptions.Web);
        }
        catch (JsonException exception)
        {
            throw new AiProviderException(
                "Gemini devolvió un mapa de orquestación que no es JSON válido.",
                exception);
        }

        if (response is null ||
            string.IsNullOrWhiteSpace(response.Status) ||
            string.IsNullOrWhiteSpace(response.Reply) ||
            string.IsNullOrWhiteSpace(response.Summary) ||
            response.Questions is null ||
            response.Plan is null ||
            response.Assumptions is null ||
            response.Nodes is null ||
            response.Relations is null)
        {
            throw new AiProviderException("Gemini devolvió un contrato de planificación incompleto.");
        }

        return response;
    }

    private static ArchitectureAiResponse ParseArchitectureResponse(string generatedContentJson)
    {
        ArchitectureAiResponse? response;

        try
        {
            response = JsonSerializer.Deserialize<ArchitectureAiResponse>(
                generatedContentJson,
                JsonSerializerOptions.Web);
        }
        catch (JsonException exception)
        {
            throw new AiProviderException(
                "Gemini devolvió un contrato de arquitectura que no es JSON válido.",
                exception);
        }

        if (response is null ||
            string.IsNullOrWhiteSpace(response.Language) ||
            string.IsNullOrWhiteSpace(response.Summary) ||
            response.Contexts is null)
        {
            throw new AiProviderException("Gemini devolvió un contrato de arquitectura incompleto.");
        }

        return response;
    }

    private static readonly object PlannerResponseJsonSchema = new
    {
        type = "object",
        additionalProperties = false,
        properties = new
        {
            status = new
            {
                type = "string",
                @enum = new[] { "needs_clarification", "ready", "out_of_scope" }
            },
            reply = new { type = "string" },
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
            assumptions = new
            {
                type = "array",
                items = new { type = "string" }
            },
            language = new
            {
                type = "string",
                nullable = true
            },
            nodes = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    additionalProperties = false,
                    properties = new
                    {
                        key = new { type = "string" },
                        name = new { type = "string" },
                        description = new { type = "string", nullable = true },
                        kind = new
                        {
                            type = "string",
                            @enum = new[] { "system", "orchestrator", "actor", "step" }
                        },
                        role = new { type = "string", nullable = true },
                        responsibility = new { type = "string", nullable = true },
                        status = new
                        {
                            type = "string",
                            @enum = new[] { "detected", "assumed", "confirmed" }
                        }
                    },
                    required = new[]
                    {
                        "key", "name", "description", "kind", "role", "responsibility", "status"
                    }
                }
            },
            relations = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    additionalProperties = false,
                    properties = new
                    {
                        from = new { type = "string" },
                        to = new { type = "string" },
                        label = new { type = "string" },
                        operation = new { type = "string", nullable = true },
                        description = new { type = "string", nullable = true },
                        kind = new { type = "string", nullable = true }
                    },
                    required = new[]
                    {
                        "from", "to", "label", "operation", "description", "kind"
                    }
                }
            }
        },
        required = new[]
        {
            "status", "reply", "summary", "questions", "plan", "assumptions", "language",
            "nodes", "relations"
        }
    };

    private static readonly object ArchitectureResponseJsonSchema = new
    {
        type = "object",
        additionalProperties = false,
        properties = new
        {
            language = new
            {
                type = "string",
                @enum = new[] { "python", "dotnet" }
            },
            summary = new { type = "string" },
            contexts = new
            {
                type = "array",
                items = new
                {
                    type = "object",
                    additionalProperties = false,
                    properties = new
                    {
                        key = new { type = "string" },
                        summary = new { type = "string" },
                        code = new { type = "string" },
                        dependencies = new
                        {
                            type = "array",
                            items = new { type = "string" }
                        },
                        env = new
                        {
                            type = "array",
                            items = new
                            {
                                type = "object",
                                additionalProperties = false,
                                properties = new
                                {
                                    name = new { type = "string" },
                                    example = new { type = "string", nullable = true },
                                    description = new { type = "string", nullable = true }
                                },
                                required = new[] { "name", "example", "description" }
                            }
                        },
                        assumptions = new
                        {
                            type = "array",
                            items = new { type = "string" }
                        },
                        warnings = new
                        {
                            type = "array",
                            items = new { type = "string" }
                        }
                    },
                    required = new[]
                    {
                        "key", "summary", "code", "dependencies", "env", "assumptions", "warnings"
                    }
                }
            }
        },
        required = new[] { "language", "summary", "contexts" }
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
}
