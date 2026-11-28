using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.AI.Contracts;

namespace OrquestadorApi.Services.AI;

public sealed class AiSelectionService : IAiSelectionService, IAiProvider, IDisposable
{
    private static readonly AiModelResponse[] BdtModels =
    [
        new("gpt-6-luna-high", "Luna 6.0 - High"),
        new("qwen-maximo", "qwen-maximo"),
        new("gpt-6.1-sol-high", "Sol 6.1 - High"),
        new("gpt-6.1-sol-low", "Sol 6.1 - Low"),
        new("gpt-6.1-sol-medium", "Sol 6.1 - Medium"),
        new("gpt-6.1-terra-high", "Terra 6.1 - High"),
        new("gpt-6.1-terra-medium", "Terra 6.1 - Medium")
    ];
    private readonly IOptions<AiOptions> _options;
    private readonly AiOptionsValidator _validator;
    private readonly IHttpClientFactory _clients;
    private readonly IAiRulesProvider _rules;
    private IAiProvider? _provider;
    private HttpClient? _client;

    public AiSelectionService(
        IOptions<AiOptions> options,
        AiOptionsValidator validator,
        IHttpClientFactory clients,
        IAiRulesProvider rules)
    {
        _options = options;
        _validator = validator;
        _clients = clients;
        _rules = rules;
    }

    public AiModelsResponse GetModels()
    {
        var options = _options.Value;
        var providers = new List<AiProviderResponse>();
        if (IsAvailable(AiOptions.GeminiProvider))
        {
            providers.Add(new AiProviderResponse(AiOptions.GeminiProvider,
                [new AiModelResponse(options.Gemini.Model, "Gemini")]));
        }
        if (IsAvailable(AiOptions.BdtProvider))
        {
            providers.Add(new AiProviderResponse(AiOptions.BdtProvider, BdtModels));
        }

        AiSelectionRequest? defaultSelection = null;
        if (IsAvailable(options.Provider) &&
            (!options.IsBdt || BdtModels.Any(m => m.Id == options.Bdt.Model)))
        {
            defaultSelection = new AiSelectionRequest
            {
                Provider = options.IsBdt ? AiOptions.BdtProvider : AiOptions.GeminiProvider,
                Model = options.IsBdt ? options.Bdt.Model : null
            };
        }
        return new AiModelsResponse(defaultSelection, providers);
    }

    public string? Select(AiSelectionRequest? selection)
    {
        var options = _options.Value;
        var provider = selection is null ? options.Provider : selection.Provider;
        if (string.IsNullOrWhiteSpace(provider))
        {
            return "Debe indicar un proveedor de IA.";
        }

        var isGemini = string.Equals(provider, AiOptions.GeminiProvider, StringComparison.OrdinalIgnoreCase);
        var isBdt = string.Equals(provider, AiOptions.BdtProvider, StringComparison.OrdinalIgnoreCase);
        if (!isGemini && !isBdt)
        {
            return "El proveedor de IA indicado no es válido.";
        }

        var model = selection is null && isBdt ? options.Bdt.Model : selection?.Model;
        if (isGemini && model is not null &&
            !string.Equals(model, options.Gemini.Model, StringComparison.Ordinal))
        {
            return "El modelo indicado no está disponible para Gemini.";
        }
        if (isBdt && (string.IsNullOrWhiteSpace(model) ||
            !BdtModels.Any(m => m.Id == model)))
        {
            return "El modelo indicado no está disponible para BDT. Consultá el catálogo de modelos.";
        }
        if (!IsAvailable(provider))
        {
            return $"El proveedor {provider} no está configurado o su configuración es inválida.";
        }

        _client?.Dispose();
        _client = _clients.CreateClient(isBdt ? AiOptions.BdtProvider : AiOptions.GeminiProvider);
        var baseUrl = isBdt ? options.Bdt.BaseUrl : options.Gemini.BaseUrl;
        _client.BaseAddress = new Uri($"{baseUrl.TrimEnd('/')}/");
        _provider = isBdt
            ? new BdtAiProvider(_client, _options, _rules, model)
            : new GeminiAiProvider(_client, _options, _rules);
        return null;
    }

    private bool IsAvailable(string provider) =>
        _validator.ValidateProvider(_options.Value, provider).Succeeded;

    private IAiProvider Provider => _provider ??
        throw new InvalidOperationException("Debe seleccionarse un proveedor de IA antes de generar contenido.");

    public string ProviderName => Provider.ProviderName;

    public Task<PlannerAiResponse> GeneratePlanAsync(string agentInput, CancellationToken cancellationToken = default) =>
        Provider.GeneratePlanAsync(agentInput, cancellationToken);

    public Task<string> GenerateResumenAsync(
        string initialPrompt, string? previousResumen, string userMessage,
        PlannerAiResponse response, IReadOnlyList<PlannerNodeNote> nodeNotes,
        CancellationToken cancellationToken = default) =>
        Provider.GenerateResumenAsync(initialPrompt, previousResumen, userMessage, response, nodeNotes, cancellationToken);

    public Task<ArchitectureAiResponse> GenerateArchitectureAsync(string agentInput, CancellationToken cancellationToken = default) =>
        Provider.GenerateArchitectureAsync(agentInput, cancellationToken);

    public void Dispose() => _client?.Dispose();
}
