using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrquestadorApi.Migrations
{
    /// <inheritdoc />
    public partial class IncludeOperationInRelationIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_orchestration_relations_context_id_source_node_id_target_no~",
                table: "orchestration_relations");

            migrationBuilder.AddColumn<string>(
                name: "operation_key",
                table: "orchestration_relations",
                type: "text",
                nullable: false,
                computedColumnSql: "coalesce(nullif(btrim(case when http_method is not null and path is not null then http_method || ' ' || path else operation end, ' ' || chr(9) || chr(10) || chr(11) || chr(12) || chr(13)), ''), '')",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "ux_relations_context_endpoints_label_operation",
                table: "orchestration_relations",
                columns: new[] { "context_id", "source_node_id", "target_node_id", "label", "operation_key" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_relations_context_endpoints_label_operation",
                table: "orchestration_relations");

            migrationBuilder.DropColumn(
                name: "operation_key",
                table: "orchestration_relations");

            migrationBuilder.CreateIndex(
                name: "IX_orchestration_relations_context_id_source_node_id_target_no~",
                table: "orchestration_relations",
                columns: new[] { "context_id", "source_node_id", "target_node_id", "label" },
                unique: true);
        }
    }
}
