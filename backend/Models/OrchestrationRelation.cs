using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrquestadorApi.Models;

[Table("orchestration_relations")]
public class OrchestrationRelation
{
    [Key]
    [Column("relation_id")]
    public int RelationId { get; set; }

    [Column("context_id")]
    public int ContextId { get; set; }

    [Column("source_node_id")]
    public int SourceNodeId { get; set; }

    [Column("target_node_id")]
    public int TargetNodeId { get; set; }

    [Required]
    [Column("label")]
    public required string Label { get; set; }

    [Column("operation")]
    public string? Operation { get; set; }

    [MaxLength(10)]
    [Column("http_method")]
    public string? HttpMethod { get; set; }

    [MaxLength(2048)]
    [Column("path")]
    public string? Path { get; set; }

    [NotMapped]
    public string? EffectiveOperation => HttpMethod is not null && Path is not null
        ? $"{HttpMethod} {Path}"
        : Operation;

    [Column("description")]
    public string? Description { get; set; }

    [Column("kind")]
    public string? Kind { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    public ProjectContext ProjectContext { get; set; } = null!;

    public OrchestrationNode SourceNode { get; set; } = null!;

    public OrchestrationNode TargetNode { get; set; } = null!;
}
