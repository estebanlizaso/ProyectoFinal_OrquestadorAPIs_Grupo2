using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using OrquestadorApi.Configuration;
using OrquestadorApi.Data;
using OrquestadorApi.Services.AI;
using OrquestadorApi.Services.Architecture;
using OrquestadorApi.Services.Contexts;
using OrquestadorApi.Services.Drive;
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
builder.Services
    .AddOptions<OrchestrationOptions>()
    .Bind(builder.Configuration.GetSection(OrchestrationOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services
    .AddOptions<DriveOptions>()
    .Bind(builder.Configuration.GetSection(DriveOptions.SectionName))
    .Configure(options =>
    {
        // Nombres simples para el equipo (prioridad sobre Drive__*).
        options.RootFolderId =
            FirstNonEmpty(Environment.GetEnvironmentVariable("DRIVE_ID"), options.RootFolderId);
        options.OAuthClientId =
            FirstNonEmpty(Environment.GetEnvironmentVariable("CLIENT_DRIVE"), options.OAuthClientId);
        options.OAuthClientSecret =
            FirstNonEmpty(Environment.GetEnvironmentVariable("CLIENT_SECRET_DRIVE"), options.OAuthClientSecret);
        options.OAuthRefreshToken =
            FirstNonEmpty(Environment.GetEnvironmentVariable("REFRESH_TOKEN_DRIVE"), options.OAuthRefreshToken);

        var driveEnabled = Environment.GetEnvironmentVariable("DRIVE_ENABLED");
        if (bool.TryParse(driveEnabled, out var enabled))
        {
            options.Enabled = enabled;
        }
        else if (!string.IsNullOrWhiteSpace(options.RootFolderId) &&
                 !string.IsNullOrWhiteSpace(options.OAuthClientId) &&
                 !string.IsNullOrWhiteSpace(options.OAuthClientSecret) &&
                 !string.IsNullOrWhiteSpace(options.OAuthRefreshToken))
        {
            options.Enabled = true;
        }
    })
    .Validate(
        options => !options.Enabled || options.IsConfigured,
        "Si Drive está habilitado, configurá DRIVE_ID, CLIENT_DRIVE, CLIENT_SECRET_DRIVE y REFRESH_TOKEN_DRIVE.")
    .ValidateOnStart();
builder.Services.AddHttpClient<IAiProvider, GeminiAiProvider>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<IOptions<AiOptions>>().Value;
    client.BaseAddress = new Uri($"{options.BaseUrl.TrimEnd('/')}/");
    client.Timeout = TimeSpan.FromSeconds(
        Math.Max(options.TimeoutSeconds, options.ArchitectureTimeoutSeconds) + 10);
});
builder.Services.AddSingleton<IAiRulesProvider, JsonAiRulesProvider>();
builder.Services.AddSingleton<IArchitecturePackageBuilder, ArchitectureZipBuilder>();
builder.Services.AddSingleton<IPostmanCollectionBuilder, PostmanCollectionBuilder>();
builder.Services.AddSingleton<IDriveStorage>(serviceProvider =>
{
    var driveOptions = serviceProvider.GetRequiredService<IOptions<DriveOptions>>().Value;
    if (!driveOptions.IsConfigured)
    {
        return new DisabledDriveStorage();
    }

    return ActivatorUtilities.CreateInstance<GoogleDriveStorage>(serviceProvider);
});
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

static string? FirstNonEmpty(string? preferred, string? fallback) =>
    !string.IsNullOrWhiteSpace(preferred) ? preferred.Trim() : fallback;
