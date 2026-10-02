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

        var seedNames = seedProjects.Select(project => project.ProjectName).ToArray();
        var existingNames = await dbContext.Projects
            .Where(project => seedNames.Contains(project.ProjectName))
            .Select(project => project.ProjectName)
            .ToListAsync();

        var missingProjects = seedProjects
            .Where(project => !existingNames.Contains(project.ProjectName))
            .ToArray();

        if (missingProjects.Length == 0)
        {
            return;
        }

        dbContext.Projects.AddRange(missingProjects);
        await dbContext.SaveChangesAsync();
    }
}
