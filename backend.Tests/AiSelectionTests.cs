using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.Controllers;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Architecture;
using OrquestadorApi.Services.Contexts;
using Xunit;

namespace OrquestadorApi.Tests;

public class AiSelectionTests
{
    [Fact]
    public void Catalog_includes_only_configured_providers_and_no_credentials()
    {
        var options = CreateOptions();
        options.Bdt.ApiKey = "";
        using var selection = CreateSelection(options, new RecordingHandler());

        var catalog = selection.GetModels();

        Assert.Equal("Gemini", Assert.Single(catalog.Providers).Id);
        Assert.Equal("Gemini", catalog.DefaultSelection?.Provider);
        Assert.DoesNotContain("secret", JsonSerializer.Serialize(catalog));
        Assert.DoesNotContain("https://", JsonSerializer.Serialize(catalog));
    }

    [Fact]
    public void Catalog_has_no_default_when_default_provider_is_unavailable()
    {
        var options = CreateOptions();
        options.Gemini.ApiKey = "";
        using var selection = CreateSelection(options, new RecordingHandler());

        var catalog = selection.GetModels();

        Assert.Null(catalog.DefaultSelection);
        Assert.Equal("Bdt", Assert.Single(catalog.Providers).Id);
        Assert.NotNull(selection.Select(null));
        Assert.Null(selection.Select(new AiSelectionRequest { Provider = "Bdt", Model = "qwen-rapido" }));
    }

    [Theory]
    [InlineData("qwen-rapido")]
    [InlineData("qwen-maximo")]
    public async Task Selected_bdt_model_is_used_for_all_operations(string model)
    {
        var handler = new RecordingHandler();
        using var selection = CreateSelection(CreateOptions(), handler);
        Assert.Null(selection.Select(new AiSelectionRequest { Provider = "Bdt", Model = model }));

        var plan = await selection.GeneratePlanAsync("test");
        await selection.GenerateResumenAsync("initial", null, "message", plan, []);
        await selection.GenerateArchitectureAsync("architecture");

        Assert.Equal(3, handler.Bodies.Count);
        foreach (var body in handler.Bodies)
        {
            using var json = JsonDocument.Parse(body);
            Assert.Equal(model, json.RootElement.GetProperty("model").GetString());
        }
    }

    [Fact]
    public async Task Independent_selections_do_not_share_models()
    {
        var handler = new RecordingHandler();
        var options = CreateOptions();
        using var first = CreateSelection(options, handler);
        using var second = CreateSelection(options, handler);
        Assert.Null(first.Select(new AiSelectionRequest { Provider = "Bdt", Model = "qwen-rapido" }));
        Assert.Null(second.Select(new AiSelectionRequest { Provider = "Bdt", Model = "qwen-maximo" }));

        await Task.WhenAll(first.GeneratePlanAsync("one"), second.GeneratePlanAsync("two"));

        Assert.Contains(handler.Bodies, body => body.Contains("\"qwen-rapido\""));
        Assert.Contains(handler.Bodies, body => body.Contains("\"qwen-maximo\""));
        Assert.Equal("qwen-rapido", options.Bdt.Model);
    }

    [Fact]
    public async Task Missing_selection_uses_configured_default_gemini()
    {
        var handler = new RecordingHandler();
        using var selection = CreateSelection(CreateOptions(), handler);
        Assert.Null(selection.Select(null));

        var result = await selection.GeneratePlanAsync("test");

        Assert.Equal("ready", result.Status);
        Assert.Equal("Gemini", selection.ProviderName);
        Assert.Contains("/models/gemini-test:generateContent", Assert.Single(handler.Uris));
    }

    [Fact]
    public async Task Gemini_can_process_plan_summary_and_architecture()
    {
        var handler = new RecordingHandler();
        using var selection = CreateSelection(CreateOptions(), handler);
        Assert.Null(selection.Select(new AiSelectionRequest { Provider = "Gemini" }));

        var plan = await selection.GeneratePlanAsync("test");
        var summary = await selection.GenerateResumenAsync("initial", null, "message", plan, []);
        var architecture = await selection.GenerateArchitectureAsync("architecture");

        Assert.Equal("ready", plan.Status);
        Assert.Equal("ok", summary);
        Assert.Equal("python", architecture.Language);
        Assert.Equal(3, handler.Uris.Count);
        Assert.All(handler.Uris, uri => Assert.Contains("gemini.test", uri));
    }

    [Fact]
    public async Task Default_bdt_model_is_used_when_selection_is_omitted()
    {
        var handler = new RecordingHandler();
        var options = CreateOptions();
        options.Provider = "Bdt";
        options.Bdt.Model = "qwen-maximo";
        using var selection = CreateSelection(options, handler);

        Assert.Equal("qwen-maximo", selection.GetModels().DefaultSelection?.Model);
        Assert.Null(selection.Select(null));
        await selection.GeneratePlanAsync("test");
        Assert.Contains("\"qwen-maximo\"", Assert.Single(handler.Bodies));
    }

    [Fact]
    public void Invalid_default_model_does_not_prevent_explicit_bdt_selection()
    {
        var options = CreateOptions();
        options.Provider = "Bdt";
        options.Bdt.Model = "unknown";
        using var selection = CreateSelection(options, new RecordingHandler());

        Assert.Null(selection.GetModels().DefaultSelection);
        Assert.Equal(2, selection.GetModels().Providers.Single(p => p.Id == "Bdt").Models.Count);
        Assert.NotNull(selection.Select(null));
        Assert.Null(selection.Select(new AiSelectionRequest { Provider = "Bdt", Model = "qwen-rapido" }));
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("Other", null)]
    [InlineData("Bdt", null)]
    [InlineData("Bdt", "other-model")]
    [InlineData("Gemini", "other-model")]
    public void Invalid_selections_are_rejected(string? provider, string? model)
    {
        using var selection = CreateSelection(CreateOptions(), new RecordingHandler());
        Assert.NotNull(selection.Select(new AiSelectionRequest { Provider = provider, Model = model }));
    }

    [Fact]
    public async Task Controllers_reject_invalid_selection_before_calling_services()
    {
        using var selection = CreateSelection(CreateOptions(), new RecordingHandler());
        var context = new ProjectContextsController(null!, selection);
        var architecture = new ProjectArchitectureController(null!, selection);
        var invalid = new AiSelectionRequest { Provider = "Bdt", Model = "bad" };

        var contextResult = await context.Create(1,
            new CreateProjectContextRequest { Prompt = "test", AiSelection = invalid }, default);
        var architectureResult = await architecture.Generate(1,
            new GenerateArchitectureRequest { AiSelection = invalid }, default);

        Assert.IsType<BadRequestObjectResult>(contextResult.Result);
        Assert.IsType<BadRequestObjectResult>(architectureResult.Result);
    }

    private static AiOptions CreateOptions() => new()
    {
        Gemini = new GeminiOptions
        {
            BaseUrl = "https://gemini.test", ApiVersion = "v1beta", Model = "gemini-test", ApiKey = "secret-gemini"
        },
        Bdt = new BdtOptions
        {
            BaseUrl = "https://bdt.test/v1", Model = "qwen-rapido", ApiKey = "secret-bdt"
        }
    };

    private static AiSelectionService CreateSelection(AiOptions options, RecordingHandler handler) =>
        new(Options.Create(options), new AiOptionsValidator(), new ClientFactory(handler), new Rules());

    private sealed class ClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class Rules : IAiRulesProvider
    {
        public string PlannerRulesJson => "{}";
        public string RulesJson => "{}";
        public string SummaryRulesJson => "{}";
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];
        public List<string> Uris { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            lock (Bodies)
            {
                Bodies.Add(body);
                Uris.Add(request.RequestUri!.ToString());
            }
            using var requestJson = JsonDocument.Parse(body);
            var userInput = request.RequestUri!.Host == "gemini.test"
                ? requestJson.RootElement.GetProperty("contents")[0].GetProperty("parts")[0].GetProperty("text").GetString()
                : requestJson.RootElement.GetProperty("messages")[1].GetProperty("content").GetString();
            var content = userInput is not null && userInput.StartsWith("{\"initialPrompt\"", StringComparison.Ordinal)
                ? "{\"resumen\":\"ok\"}"
                : userInput == "architecture"
                    ? "{\"language\":\"python\",\"summary\":\"ok\",\"contexts\":[]}"
                    : "{\"status\":\"ready\",\"reply\":\"ok\",\"summary\":\"ok\",\"questions\":[],\"plan\":[],\"assumptions\":[],\"nodes\":[],\"relations\":[]}";
            var response = request.RequestUri!.Host == "gemini.test"
                ? JsonSerializer.Serialize(new { candidates = new[] { new { content = new { parts = new[] { new { text = content } } } } } })
                : JsonSerializer.Serialize(new { choices = new[] { new { message = new { content }, finish_reason = "stop" } } });
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(response, Encoding.UTF8, "application/json")
            };
        }
    }
}
