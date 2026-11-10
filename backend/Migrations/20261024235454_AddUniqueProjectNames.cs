using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueProjectNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep this check and the index creation in the same transaction.
            // Block writes so duplicates cannot appear between the check and the DDL.
            migrationBuilder.Sql("""
                LOCK TABLE projects IN SHARE ROW EXCLUSIVE MODE;
                DO $preflight$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM projects
                        GROUP BY lower(btrim(project_name))
                        HAVING count(*) > 1
                    ) THEN
                        RAISE EXCEPTION USING
                            ERRCODE = '23505',
                            MESSAGE = 'Existen proyectos con nombres equivalentes. Migración cancelada sin modificar datos.',
                            HINT = 'Ejecutar la consulta de diagnóstico del README y acordar la resolución de duplicados antes de reintentar.';
                    END IF;
                END;
                $preflight$;
                """);

            migrationBuilder.AddColumn<string>(
                name: "project_name_normalized",
                table: "projects",
                type: "text",
                nullable: false,
                computedColumnSql: "lower(btrim(project_name))",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "ux_projects_project_name_normalized",
                table: "projects",
                column: "project_name_normalized",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_projects_project_name_normalized",
                table: "projects");

            migrationBuilder.DropColumn(
                name: "project_name_normalized",
                table: "projects");
        }
    }
}
