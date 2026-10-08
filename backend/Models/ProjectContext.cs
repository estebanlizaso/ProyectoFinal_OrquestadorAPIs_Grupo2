using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrquestadorApi.Models;

[Table("contexts")]
public class ProjectContext
{
    [Key]
    [Column("context_id")]
    public int ContextId { get; set; }

    [Column("project_id")]
    public int ProjectId { get; set; }

    [Required]
    [Column("initial_prompt")]
    public required string InitialPrompt { get; set; }

    public Project Project { get; set; } = null!;
}
