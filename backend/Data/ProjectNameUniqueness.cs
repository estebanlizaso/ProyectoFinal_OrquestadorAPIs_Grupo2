using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace OrquestadorApi.Data;

public static class ProjectNameUniqueness
{
    public const string IndexName = "ux_projects_project_name_normalized";

    public static bool IsViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: IndexName
        };

    // Normalize both operands in PostgreSQL: casing follows the database locale.
    public static Task<bool> ExistsAsync(
        AppDbContext dbContext, string name, CancellationToken cancellationToken = default) =>
        dbContext.Projects.FromSqlInterpolated($"""
            SELECT * FROM projects
            WHERE project_name_normalized = lower(btrim({name}))
            """).AsNoTracking().AnyAsync(cancellationToken);
}
