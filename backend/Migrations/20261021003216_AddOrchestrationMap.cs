using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOrchestrationMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "language",
                table: "contexts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "map_version",
                table: "contexts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string[]>(
                name: "planner_assumptions",
                table: "contexts",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "planner_plan",
                table: "contexts",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "planner_questions",
                table: "contexts",
                type: "text[]",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "planner_reply",
                table: "contexts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "planner_status",
                table: "contexts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "planner_summary",
                table: "contexts",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "orchestration_nodes",
                columns: table => new
                {
                    node_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    context_id = table.Column<int>(type: "integer", nullable: false),
                    key = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    kind = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: true),
                    responsibility = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    user_notes = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orchestration_nodes", x => x.node_id);
                    table.ForeignKey(
                        name: "FK_orchestration_nodes_contexts_context_id",
                        column: x => x.context_id,
                        principalTable: "contexts",
                        principalColumn: "context_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orchestration_relations",
                columns: table => new
                {
                    relation_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    context_id = table.Column<int>(type: "integer", nullable: false),
                    source_node_id = table.Column<int>(type: "integer", nullable: false),
                    target_node_id = table.Column<int>(type: "integer", nullable: false),
                    label = table.Column<string>(type: "text", nullable: false),
                    operation = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    kind = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orchestration_relations", x => x.relation_id);
                    table.ForeignKey(
                        name: "FK_orchestration_relations_contexts_context_id",
                        column: x => x.context_id,
                        principalTable: "contexts",
                        principalColumn: "context_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_orchestration_relations_orchestration_nodes_source_node_id",
                        column: x => x.source_node_id,
                        principalTable: "orchestration_nodes",
                        principalColumn: "node_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_orchestration_relations_orchestration_nodes_target_node_id",
                        column: x => x.target_node_id,
                        principalTable: "orchestration_nodes",
                        principalColumn: "node_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_nodes_context_id_is_active",
                table: "orchestration_nodes",
                columns: new[] { "context_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_nodes_context_id_key",
                table: "orchestration_nodes",
                columns: new[] { "context_id", "key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_relations_context_id",
                table: "orchestration_relations",
                column: "context_id");

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_relations_context_id_source_node_id_target_no~",
                table: "orchestration_relations",
                columns: new[] { "context_id", "source_node_id", "target_node_id", "label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_relations_source_node_id",
                table: "orchestration_relations",
                column: "source_node_id");

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_relations_target_node_id",
                table: "orchestration_relations",
                column: "target_node_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "orchestration_relations");

            migrationBuilder.DropTable(
                name: "orchestration_nodes");

            migrationBuilder.DropColumn(
                name: "language",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "map_version",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_assumptions",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_plan",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_questions",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_reply",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_status",
                table: "contexts");

            migrationBuilder.DropColumn(
                name: "planner_summary",
                table: "contexts");
        }
    }
}
