using System.Text.Json;
using OrquestadorApi.DTOs;
using OrquestadorApi.Services.Architecture;
using Xunit;

namespace OrquestadorApi.Tests;

public class PostmanCollectionTests
{
    private readonly PostmanCollectionBuilder _builder = new();

    [Fact]
    public void Collection_uses_public_endpoints_with_local_base_url()
    {
        var architecture = new ArchitectureResponse(
            1, 15, "python", 1, DateTime.UtcNow, "API local", null,
            [], [], false,
            PublicEndpoints:
            [
                new("POST", "/orquestar", "Orquestar", "Inicia el flujo",
                    """{"clienteId":42}""", "application/json"),
                new("GET", "/health", "Health", null, null, null)
            ]);

        using var document = JsonDocument.Parse(_builder.Build("Demo", architecture).GetRawText());
        var root = document.RootElement;

        Assert.Equal(
            "http://127.0.0.1:5000",
            root.GetProperty("variable")[0].GetProperty("value").GetString());

        var items = root.GetProperty("item");
        Assert.Equal(2, items.GetArrayLength());

        var first = items[0];
        Assert.Equal("Orquestar", first.GetProperty("name").GetString());
        Assert.Equal("POST", first.GetProperty("request").GetProperty("method").GetString());
        Assert.Equal(
            "{{baseUrl}}/orquestar",
            first.GetProperty("request").GetProperty("url").GetProperty("raw").GetString());
        Assert.Equal(
            """{"clienteId":42}""",
            first.GetProperty("request").GetProperty("body").GetProperty("raw").GetString());
        Assert.Equal(
            "application/json",
            first.GetProperty("request").GetProperty("header")[0].GetProperty("value").GetString());

        var second = items[1];
        Assert.Equal("Health", second.GetProperty("name").GetString());
        Assert.Equal("GET", second.GetProperty("request").GetProperty("method").GetString());
        Assert.True(
            !second.GetProperty("request").TryGetProperty("body", out var body) ||
            body.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined);
    }

    [Fact]
    public void Collection_ignores_map_style_external_urls_and_empty_list_for_cli()
    {
        var architecture = new ArchitectureResponse(
            1, 2, "python", 1, DateTime.UtcNow, "CLI", null,
            [], [], false,
            PublicEndpoints:
            [
                new("GET", "https://api.externa.test/v1/clientes", "Externa", null, null, null)
            ]);

        using var withInvalid = JsonDocument.Parse(_builder.Build("Demo", architecture).GetRawText());
        Assert.Empty(withInvalid.RootElement.GetProperty("item").EnumerateArray());

        var cli = architecture with { PublicEndpoints = [] };
        using var empty = JsonDocument.Parse(_builder.Build("Demo", cli).GetRawText());
        Assert.Empty(empty.RootElement.GetProperty("item").EnumerateArray());
        Assert.Contains(
            "USAGE.md",
            empty.RootElement.GetProperty("info").GetProperty("description").GetString(),
            StringComparison.Ordinal);
    }
}
