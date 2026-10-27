using Microsoft.EntityFrameworkCore;
using Npgsql;
using OrquestadorApi.Models;

namespace OrquestadorApi.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        NpgsqlConnectionStringBuilder connection)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        try
        {
            await dbContext.Database.MigrateAsync();
        }
        catch (PostgresException exception)
        {
            throw new InvalidOperationException(
                "No se pudieron aplicar las migraciones de PostgreSQL. " +
                "Revisá el error original y verificá los nombres duplicados antes de reintentar.",
                exception);
        }
        catch (Exception exception) when (exception is NpgsqlException or TimeoutException)
        {
            throw new InvalidOperationException(
                $"No se pudo conectar a PostgreSQL en '{connection.Host}:{connection.Port}' " +
                $"usando la base '{connection.Database}' y el usuario '{connection.Username}'. " +
                "Verifica que PostgreSQL esté iniciado y que los valores de .env sean correctos.",
                exception);
        }

        var seedProjects = new[]
        {
            new Project
            {
                ProjectName = "Orquestador de pagos",
                Description = "Coordina el procesamiento de pagos.",
                CreatedAt = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc)
            },
            new Project
            {
                ProjectName = "Orquestador de clientes",
                Description = "Sincroniza información de clientes.",
                CreatedAt = new DateTime(2026, 2, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Project
            {
                ProjectName = "Orquestador de inventario",
                Description = "Actualiza existencias entre sistemas.",
                CreatedAt = new DateTime(2026, 3, 20, 0, 0, 0, DateTimeKind.Utc)
            },
            new Project
            {
                ProjectName = "Orquestador de notificaciones",
                Description = "Distribuye notificaciones a los canales configurados.",
                CreatedAt = new DateTime(2026, 4, 25, 0, 0, 0, DateTimeKind.Utc)
            }
        };

        foreach (var project in seedProjects)
        {
            // PostgreSQL calculates the normalized key. Only this conflict is ignored,
            // including when another application instance seeds the same name concurrently.
            await dbContext.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO projects (project_name, description, created_at)
                VALUES ({project.ProjectName}, {project.Description}, {project.CreatedAt})
                ON CONFLICT (project_name_normalized) DO NOTHING
                """);
        }
    }
}
