namespace OrquestadorApi.DTOs;

/// <summary>Catálogo de proveedores configurados y selección predeterminada.</summary>
public sealed record AiModelsResponse(
    AiSelectionRequest? DefaultSelection,
    IReadOnlyList<AiProviderResponse> Providers);

/// <summary>Proveedor de IA configurado.</summary>
public sealed record AiProviderResponse(string Id, IReadOnlyList<AiModelResponse> Models);

/// <summary>Modelo seleccionable.</summary>
public sealed record AiModelResponse(string Id, string Name);
