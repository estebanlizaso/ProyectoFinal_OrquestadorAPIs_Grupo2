using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRepositoryBlueprint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "repository_blueprint",
                table: "contexts",
                type: "text",
                nullable: true);
            migrationBuilder.AddColumn<int>(
                name: "repository_blueprint_version",
                table: "contexts",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "repository_blueprint",
                table: "contexts");
            migrationBuilder.DropColumn(
                name: "repository_blueprint_version",
                table: "contexts");
        }
    }
}
