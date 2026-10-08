using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrquestadorApi.Models;

[Table("projects")]
public class Project
{
    [Key]
    [Column("project_id")]
    public int ProjectId { get; set; }

    [Required]
    [Column("project_name")]
    public required string ProjectName { get; set; }

    [Column("created_at")]
    public DateTime? CreatedAt { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    public ProjectContext? Context { get; set; }
}
