using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using OrquestadorApi.Data;
using OrquestadorApi.Services;

var builder = WebApplication.CreateBuilder(args);

var envPath = Path.Combine(builder.Environment.ContentRootPath, ".env");

if (!File.Exists(envPath))
{
    throw new InvalidOperationException(
        $"No se encontró el archivo de configuración '{envPath}'. " +
        "Crea el archivo .env usando .env.example como referencia.");
}

Env.Load(envPath);

var rawConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");

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
builder.Services.AddScoped<IProjectService, ProjectService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.MapControllers();

await DatabaseInitializer.InitializeAsync(app.Services, postgresConnection);

app.Run();
