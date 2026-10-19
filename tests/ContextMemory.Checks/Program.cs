using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Options;
using OrquestadorApi.Configuration;
using OrquestadorApi.DTOs;
using OrquestadorApi.Data;
using OrquestadorApi.Models;
using OrquestadorApi.Services.AI;

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

var answer = new GeneratedCodeResponse("needs_clarification", "csharp", "Backend .NET", ["¿Qué APIs?"], [], null);
var handler = new FakeGeminiHandler();
using var http = new HttpClient(handler) { BaseAddress = new Uri("https://example.invalid/") };
var provider = new GeminiAiProvider(http, Options.Create(new AiOptions
{
    BaseUrl = "https://example.invalid/", ApiVersion = "v1beta", Model = "fake", ApiKey = "fake"
}), new FakeRules());

handler.Output = JsonSerializer.Serialize(answer);
var generated = await provider.GenerateContentAsync("Pedido actual");
Check(generated.Status == "needs_clarification", "La respuesta principal debe seguir usando su contrato.");
using (var request = JsonDocument.Parse(handler.LastRequest!))
{
    Check(request.RootElement.GetProperty("systemInstruction").ToString().Contains("code-generator-test"),
        "La generación principal debe incluir sus reglas.");
}

var outside = new GeneratedCodeResponse("out_of_scope", "python", "Pedido fuera del alcance de software.", [], [], null);
handler.Output = JsonSerializer.Serialize(outside);
Check((await provider.GenerateContentAsync("Dame una receta")).Status == "out_of_scope",
    "Debe aceptar rechazos de alcance sin código ni preguntas.");
using (var request = JsonDocument.Parse(handler.LastRequest!))
{
    Check(request.RootElement.GetProperty("generationConfig").GetProperty("responseJsonSchema")
        .GetProperty("properties").GetProperty("status").GetProperty("enum")
        .EnumerateArray().Any(value => value.GetString() == "out_of_scope"),
        "El esquema enviado a Gemini debe admitir out_of_scope.");
}
foreach (var invalidOutside in new[]
{
    outside with { Code = "print('receta')" },
    outside with { Questions = new[] { "¿Qué receta?" } },
    outside with { Plan = new[] { "Preparar ingredientes" } }
})
{
    handler.Output = JsonSerializer.Serialize(invalidOutside);
    var rejected = false;
    try { await provider.GenerateContentAsync("Dame una receta"); }
    catch (AiProviderException) { rejected = true; }
    Check(rejected, "out_of_scope debe rechazar código, preguntas o plan.");
}

handler.Output = "{\"resumen\":\"Backend .NET; falta definir las APIs.\"}";
var resumen = await provider.GenerateResumenAsync("Crear backend", "Memoria anterior", "Usar .NET", answer);
Check(resumen == "Backend .NET; falta definir las APIs.", "Debe extraer el resumen del JSON.");
using (var request = JsonDocument.Parse(handler.LastRequest!))
{
    var root = request.RootElement;
    Check(!root.GetProperty("systemInstruction").ToString().Contains("code-generator-test"),
        "El resumidor debe tener instrucciones independientes.");
    Check(root.GetProperty("systemInstruction").ToString().Contains("context-summary-test"),
        "El resumidor debe incluir las reglas de su archivo independiente.");
    var input = root.GetProperty("contents")[0].GetProperty("parts")[0].GetProperty("text").GetString()!;
    using var data = JsonDocument.Parse(input);
    Check(data.RootElement.GetProperty("previousResumen").GetString() == "Memoria anterior", "Debe incluir la memoria anterior.");
    Check(data.RootElement.GetProperty("userMessage").GetString() == "Usar .NET", "Debe incluir el mensaje actual.");
    Check(data.RootElement.GetProperty("response").GetProperty("questions")[0].GetString() == "¿Qué APIs?", "Debe incluir la respuesta del agente.");
}

foreach (var invalid in new[] { "{}", "{\"resumen\":\" \"}", "{\"resumen\":42}", "not-json" })
{
    handler.Output = invalid;
    var rejected = false;
    try { await provider.GenerateResumenAsync("Inicial", null, "Mensaje", answer); }
    catch (AiProviderException) { rejected = true; }
    Check(rejected, "Debe rechazar resúmenes vacíos o inválidos.");
}

using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
    .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused").Options);
Check(!db.Database.HasPendingModelChanges(), "El snapshot debe coincidir con el modelo actual.");
var sql = db.GetService<IMigrator>().GenerateScript("20261008232112_AddProjectContexts");
Check(sql.Contains("ADD resumen text") && sql.Contains("ADD updated_at timestamp with time zone"), "La migración debe agregar las dos columnas.");
Check(db.Model.FindEntityType(typeof(ProjectContext))!.FindProperty(nameof(ProjectContext.UpdatedAt))!.IsConcurrencyToken,
    "La memoria debe protegerse de actualizaciones simultáneas.");
Console.WriteLine("OK: contratos de generación y resumen, validación, migración y concurrencia del modelo.");

sealed class FakeRules : IAiRulesProvider
{
    public string SummaryRulesJson => "{\"rule\":\"context-summary-test\"}";
    public string RulesJson => "{\"rule\":\"code-generator-test\"}";
}

sealed class FakeGeminiHandler : HttpMessageHandler
{
    public string Output { get; set; } = "";
    public string? LastRequest { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
    {
        LastRequest = await request.Content!.ReadAsStringAsync(token);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(new
            {
                candidates = new[] { new { content = new { parts = new[] { new { text = Output } } } } }
            }), System.Text.Encoding.UTF8, "application/json")
        };
    }
}
