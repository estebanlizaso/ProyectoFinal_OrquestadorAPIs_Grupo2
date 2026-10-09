using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Contexts;
using OrquestadorApi.Services.Projects;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services
    .AddOptions<AiOptions>()
    .Bind(builder.Configuration.GetSection(AiOptions.SectionName))
    .Configure(options => options.ApiKey = geminiApiKey ?? string.Empty)
    .ValidateDataAnnotations()
    .Validate(
        options => Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out _),
        "AI:BaseUrl debe ser una URL absoluta.")
    .ValidateOnStart();
builder.Services.AddHttpClient<IAiProvider, GeminiAiProvider>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<AiOptions>>().Value;
    client.BaseAddress = new Uri($"{options.BaseUrl.TrimEnd('/')}/");
    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
});
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProjectContextService, ProjectContextService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapControllers();

await DatabaseInitializer.InitializeAsync(app.Services, postgresConnection);

app.Run();
