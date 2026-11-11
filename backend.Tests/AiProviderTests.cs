using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Services.AI;
using Xunit;

namespace OrquestadorApi.Tests;

public class AiProviderTests
{
    private const string PlannerJson =
        """
        {"status":"ready","reply":"ok","summary":"s","questions":[],"plan":[],
         "assumptions":[],"language":null,"nodes":[],"relations":[]}
        """;

    [Fact]
    public async Task Bdt_sends_openai_request_and_parses_planner_response()
    {
        var handler = new StubHandler(_ => Json(HttpStatusCode.OK, Completion(PlannerJson)));
        var provider = CreateBdt(handler);

        var response = await provider.GeneratePlanAsync("hola");

        Assert.Equal("ready", response.Status);
        var request = Assert.Single(handler.Requests);
        Assert.Equal("https://bdt.test/v1/chat/completions", request.Uri);
        Assert.Equal("Bearer test-key", request.Authorization);

        using var body = JsonDocument.Parse(request.Body);
        var root = body.RootElement;
        Assert.Equal("qwen-rapido", root.GetProperty("model").GetString());
        Assert.Equal("system", root.GetProperty("messages")[0].GetProperty("role").GetString());
        Assert.Equal("hola", root.GetProperty("messages")[1].GetProperty("content").GetString());
        Assert.False(root.TryGetProperty("max_tokens", out _));

        var format = root.GetProperty("response_format");
        Assert.Equal("json_schema", format.GetProperty("type").GetString());
        var language = format.GetProperty("json_schema").GetProperty("schema")
            .GetProperty("properties").GetProperty("language").GetProperty("type");
        Assert.Equal(JsonValueKind.Array, language.ValueKind);
        Assert.Equal(["string", "null"], language.EnumerateArray().Select(e => e.GetString()));
        Assert.DoesNotContain("nullable", request.Body);
    }

    [Fact]
    public async Task Bdt_json_object_format_omits_schema_and_sends_max_tokens()
    {
        var handler = new StubHandler(_ => Json(HttpStatusCode.OK, Completion(PlannerJson)));
        var provider = CreateBdt(handler, bdt =>
        {
            bdt.ResponseFormat = BdtOptions.JsonObjectFormat;
            bdt.MaxTokens = 4000;
        });

        await provider.GeneratePlanAsync("hola");

        using var body = JsonDocument.Parse(handler.Requests[0].Body);
        var format = body.RootElement.GetProperty("response_format");
        Assert.Equal("json_object", format.GetProperty("type").GetString());
        Assert.False(format.TryGetProperty("json_schema", out _));
        Assert.Equal(4000, body.RootElement.GetProperty("max_tokens").GetInt32());
    }

    [Fact]
    public async Task Bdt_accepts_json_wrapped_in_markdown_fence()
    {
        var fenced = "```json\n" + PlannerJson + "\n```";
        var provider = CreateBdt(new StubHandler(_ => Json(HttpStatusCode.OK, Completion(fenced))));

        var response = await provider.GeneratePlanAsync("hola");

        Assert.Equal("ready", response.Status);
    }

    [Fact]
    public async Task Bdt_reports_token_exhaustion_when_content_is_empty()
    {
        var provider = CreateBdt(new StubHandler(_ =>
            Json(HttpStatusCode.OK, Completion(string.Empty, "length"))));

        var exception = await Assert.ThrowsAsync<AiProviderException>(
            () => provider.GeneratePlanAsync("hola"));

        Assert.Contains("MaxTokens", exception.Message);
    }

    [Fact]
    public async Task Bdt_retries_transient_gateway_errors()
    {
        var calls = 0;
        var handler = new StubHandler(_ => ++calls == 1
            ? Json(HttpStatusCode.GatewayTimeout, "error code: 504")
            : Json(HttpStatusCode.OK, Completion(PlannerJson)));
        var provider = CreateBdt(handler);

        await provider.GeneratePlanAsync("hola");

        Assert.Equal(2, handler.Requests.Count);
    }

    [Fact]
    public async Task Bdt_rate_limit_message_names_the_provider()
    {
        var provider = CreateBdt(new StubHandler(_ => Json(
            HttpStatusCode.TooManyRequests,
            """{"error":{"message":"rate limit exceeded"}}""")));

        var exception = await Assert.ThrowsAsync<AiProviderException>(
            () => provider.GeneratePlanAsync("hola"));

        Assert.StartsWith("BDT alcanzó el rate limit", exception.Message);
    }

    [Theory]
    [InlineData("```json\n{\"a\":1}\n```", "{\"a\":1}")]
    [InlineData("  {\"a\":1}  ", "{\"a\":1}")]
    [InlineData("```\n{\"a\":1}\n```", "{\"a\":1}")]
    public void StripMarkdownFence_returns_plain_json(string input, string expected)
    {
        Assert.Equal(expected, BdtAiProvider.StripMarkdownFence(input));
    }

    [Fact]
    public async Task Gemini_keeps_existing_request_format()
    {
        var geminiBody = JsonSerializer.Serialize(new
        {
            candidates = new[] { new { content = new { parts = new[] { new { text = PlannerJson } } } } }
        });
        var handler = new StubHandler(_ => Json(HttpStatusCode.OK, geminiBody));
        var options = new AiOptions
        {
            Gemini = new GeminiOptions
            {
                BaseUrl = "https://gemini.test",
                ApiVersion = "v1beta",
                Model = "gemini-x",
                ApiKey = "gem-key"
            }
        };
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://gemini.test/") };
        var provider = new GeminiAiProvider(client, Options.Create(options), new StubRules());

        var response = await provider.GeneratePlanAsync("hola");

        Assert.Equal("ready", response.Status);
        Assert.Equal("https://gemini.test/v1beta/models/gemini-x:generateContent", handler.Requests[0].Uri);
        Assert.Equal("gem-key", handler.Requests[0].ApiKeyHeader);
        Assert.Contains("\"nullable\":true", handler.Requests[0].Body);
    }

    [Fact]
    public void Validator_requires_settings_of_the_active_provider_only()
    {
        var validator = new AiOptionsValidator();

        var geminiOnly = new AiOptions { Provider = "Bdt" };
        var bdtFailure = validator.ValidateProvider(geminiOnly, "Bdt");
        Assert.True(bdtFailure.Failed);
        Assert.Contains(bdtFailure.Failures!, f => f.Contains("BDT_API_KEY"));
        Assert.DoesNotContain(bdtFailure.Failures!, f => f.Contains("GEMINI"));

        var bdtReady = new AiOptions
        {
            Provider = "bdt",
            Bdt = new BdtOptions { BaseUrl = "https://bdt.test/v1", Model = "qwen-rapido", ApiKey = "k" }
        };
        Assert.True(validator.ValidateProvider(bdtReady, "Bdt").Succeeded);

        var geminiMissingKey = new AiOptions();
        Assert.Contains(
            validator.ValidateProvider(geminiMissingKey, "Gemini").Failures!,
            f => f.Contains("GEMINI_API_KEY"));

        Assert.True(validator.Validate(null, geminiMissingKey).Succeeded);
        Assert.True(validator.Validate(null, new AiOptions { Provider = "Otro" }).Failed);
    }

    private static BdtAiProvider CreateBdt(StubHandler handler, Action<BdtOptions>? configure = null)
    {
        var options = new AiOptions
        {
            Provider = AiOptions.BdtProvider,
            Bdt = new BdtOptions
            {
                BaseUrl = "https://bdt.test/v1",
                Model = "qwen-rapido",
                ApiKey = "test-key"
            }
        };
        configure?.Invoke(options.Bdt);

        var client = new HttpClient(handler) { BaseAddress = new Uri("https://bdt.test/v1/") };
        return new BdtAiProvider(client, Options.Create(options), new StubRules());
    }

    private static string Completion(string content, string finishReason = "stop")
    {
        return JsonSerializer.Serialize(new
        {
            choices = new[]
            {
                new
                {
                    message = new { role = "assistant", content },
                    finish_reason = finishReason
                }
            }
        });
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body)
    {
        return new HttpResponseMessage(status)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
    }

    private sealed record CapturedRequest(
        string Uri,
        string? Authorization,
        string? ApiKeyHeader,
        string Body);

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        : HttpMessageHandler
    {
        public List<CapturedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(new CapturedRequest(
                request.RequestUri!.ToString(),
                request.Headers.Authorization?.ToString(),
                request.Headers.TryGetValues("x-goog-api-key", out var values)
                    ? values.Single()
                    : null,
                await request.Content!.ReadAsStringAsync(cancellationToken)));

            return respond(request);
        }
    }

    private sealed class StubRules : IAiRulesProvider
    {
        public string PlannerRulesJson => "{}";
        public string RulesJson => "{}";
        public string SummaryRulesJson => "{}";
    }
}
