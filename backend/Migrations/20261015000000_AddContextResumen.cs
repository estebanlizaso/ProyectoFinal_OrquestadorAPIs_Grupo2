using Microsoft.EntityFrameworkCore.Migrations;

namespace OrquestadorApi.Migrations;

public partial class AddContextResumen : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "resumen", table: "contexts", type: "text", nullable: true);
        migrationBuilder.AddColumn<DateTime>(
            name: "updated_at", table: "contexts", type: "timestamp with time zone", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "resumen", table: "contexts");
        migrationBuilder.DropColumn(name: "updated_at", table: "contexts");
    }
}
