using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationHttpInstructions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "http_method",
                table: "orchestration_relations",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "path",
                table: "orchestration_relations",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "http_method",
                table: "orchestration_relations");

            migrationBuilder.DropColumn(
                name: "path",
                table: "orchestration_relations");
        }
    }
}
