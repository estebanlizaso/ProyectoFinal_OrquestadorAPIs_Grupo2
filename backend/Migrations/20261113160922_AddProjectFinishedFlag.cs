using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectFinishedFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "finish_proyect",
                table: "projects",
                type: "boolean",
                nullable: false,
                computedColumnSql: "last_reached_stage = 2",
                stored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "finish_proyect",
                table: "projects");
        }
    }
}
