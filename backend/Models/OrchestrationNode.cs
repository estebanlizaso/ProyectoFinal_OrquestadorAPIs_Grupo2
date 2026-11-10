using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrquestadorApi.Models;

[Table("orchestration_nodes")]
public class OrchestrationNode
{
    [Key]
    [Column("node_id")]
    public int NodeId { get; set; }

    [Column("context_id")]
    public int ContextId { get; set; }

    [Required]
    [Column("key")]
    public required string Key { get; set; }

    [Required]
    [Column("name")]
    public required string Name { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Required]
    [Column("kind")]
    public required string Kind { get; set; }

    [Column("role")]
    public string? Role { get; set; }

    [Column("responsibility")]
    public string? Responsibility { get; set; }

    [Required]
    [Column("status")]
    public required string Status { get; set; }

    [Column("user_notes")]
    public string? UserNotes { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    public ProjectContext ProjectContext { get; set; } = null!;
}
