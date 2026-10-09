using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;

namespace OrquestadorApi.Services.AI;

public class GeminiAiProvider : IAiProvider
{
    private readonly HttpClient _httpClient;
    private readonly AiOptions _options;

    public GeminiAiProvider(HttpClient httpClient, IOptions<AiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<string> GenerateContentAsync(
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
                    [new GeminiContent([new GeminiPart(prompt)])]));

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
                var generatedContent = string.Join(
                    Environment.NewLine,
                    payload?.Candidates?
                        .SelectMany(candidate => candidate.Content?.Parts ?? [])
                        .Select(part => part.Text)
                        .Where(text => !string.IsNullOrWhiteSpace(text)) ?? []);

                if (string.IsNullOrWhiteSpace(generatedContent))
                {
                    throw new AiProviderException("Gemini devolvió una respuesta sin contenido.");
                }

                return generatedContent;
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

    private sealed record GeminiRequest(
        [property: JsonPropertyName("contents")] IReadOnlyList<GeminiContent> Contents);

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
