using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Architecture;
using OrquestadorApi.Services.Contexts;
using OrquestadorApi.Services.Projects;

var builder = WebApplication.CreateBuilder(args);

var frontendOrigins = builder.Configuration
    .GetSection("Cors:FrontendOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendLocal", policy =>
    {
        policy
            .WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var envPath = Path.Combine(builder.Environment.ContentRootPath, ".env");

if (!File.Exists(envPath))
{
    throw new InvalidOperationException(
        $"No se encontró el archivo de configuración '{envPath}'. " +
        "Crea el archivo .env usando .env.example como referencia.");
}

Env.Load(envPath);
builder.Configuration.AddEnvironmentVariables();

var rawConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");
var geminiApiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
var bdtApiKey = Environment.GetEnvironmentVariable("BDT_API_KEY");
var bdtApiUrl = Environment.GetEnvironmentVariable("BDT_API_URL");
var bdtModel = Environment.GetEnvironmentVariable("BDT_MODEL");

if (string.IsNullOrWhiteSpace(rawConnectionString))
{
    throw new InvalidOperationException(
        "La variable 'ConnectionStrings__Postgres' no está definida o está vacía en .env.");
}

NpgsqlConnectionStringBuilder postgresConnection;

try
{
    postgresConnection = new NpgsqlConnectionStringBuilder(rawConnectionString);
}
catch (ArgumentException exception)
{
    throw new InvalidOperationException(
        "La variable 'ConnectionStrings__Postgres' contiene una cadena de conexión inválida.",
        exception);
}

var missingValues = new Dictionary<string, string?>
{
    ["Host"] = postgresConnection.Host,
    ["Database"] = postgresConnection.Database,
    ["Username"] = postgresConnection.Username,
    ["Password"] = postgresConnection.Password
}
.Where(value => string.IsNullOrWhiteSpace(value.Value))
.Select(value => value.Key)
.ToArray();

if (missingValues.Length > 0)
{
    throw new InvalidOperationException(
        $"Faltan valores obligatorios en 'ConnectionStrings__Postgres': {string.Join(", ", missingValues)}.");
}

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(postgresConnection.ConnectionString));
builder.Services.AddSingleton<IValidateOptions<AiOptions>, AiOptionsValidator>();
builder.Services
    .AddOptions<AiOptions>()
    .Bind(builder.Configuration.GetSection(AiOptions.SectionName))
    .Configure(options =>
    {
        options.Gemini.ApiKey = geminiApiKey ?? string.Empty;
        options.Bdt.ApiKey = bdtApiKey ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(bdtApiUrl))
        {
            options.Bdt.BaseUrl = bdtApiUrl;
        }

        if (!string.IsNullOrWhiteSpace(bdtModel))
        {
            options.Bdt.Model = bdtModel;
        }
    })
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services
    .AddOptions<OrchestrationOptions>()
    .Bind(builder.Configuration.GetSection(OrchestrationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

void ConfigureAiClient(IServiceProvider serviceProvider, HttpClient client)
{
    var options = serviceProvider.GetRequiredService<IOptions<AiOptions>>().Value;
    var baseUrl = options.IsBdt ? options.Bdt.BaseUrl : options.Gemini.BaseUrl;
    client.BaseAddress = new Uri($"{baseUrl.TrimEnd('/')}/");
    client.Timeout = TimeSpan.FromSeconds(
        Math.Max(options.TimeoutSeconds, options.ArchitectureTimeoutSeconds) + 10);
}

var aiProvider = builder.Configuration[$"{AiOptions.SectionName}:Provider"];

if (string.Equals(aiProvider, AiOptions.BdtProvider, StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHttpClient<IAiProvider, BdtAiProvider>(ConfigureAiClient);
}
else
{
    builder.Services.AddHttpClient<IAiProvider, GeminiAiProvider>(ConfigureAiClient);
}
builder.Services.AddSingleton<IAiRulesProvider, JsonAiRulesProvider>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProjectContextService, ProjectContextService>();
builder.Services.AddScoped<IArchitectureService, ArchitectureService>();

var app = builder.Build();
app.UseCors("FrontendLocal");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapControllers();

await DatabaseInitializer.InitializeAsync(app.Services, postgresConnection);

app.Run();
