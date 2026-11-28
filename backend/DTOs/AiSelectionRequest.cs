namespace OrquestadorApi.DTOs;

/// <summary>Proveedor y modelo solicitados para una operación de IA.</summary>
public sealed record AiSelectionRequest
{
    /// <summary>Identificador del proveedor: Gemini o Bdt.</summary>
    public string? Provider { get; init; }

    /// <summary>Modelo BDT; para Gemini se usa el modelo configurado.</summary>
    public string? Model { get; init; }
}
