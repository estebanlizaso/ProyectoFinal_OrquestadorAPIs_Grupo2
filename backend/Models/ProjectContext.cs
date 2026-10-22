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

    [Column("resumen")]
    public string? Resumen { get; set; }

    [Column("planner_status")]
    public string? PlannerStatus { get; set; }

    [Column("planner_reply")]
    public string? PlannerReply { get; set; }

    [Column("planner_summary")]
    public string? PlannerSummary { get; set; }

    [Column("planner_plan", TypeName = "text[]")]
    public string[]? PlannerPlan { get; set; }

    [Column("planner_questions", TypeName = "text[]")]
    public string[]? PlannerQuestions { get; set; }

    [Column("planner_assumptions", TypeName = "text[]")]
    public string[]? PlannerAssumptions { get; set; }

    [Column("language")]
    public string? Language { get; set; }

    [Column("map_version")]
    public int MapVersion { get; set; }

    [ConcurrencyCheck]
    [Column("updated_at")]
    public DateTime? UpdatedAt { get; set; }

    public Project Project { get; set; } = null!;

    public ICollection<OrchestrationNode> OrchestrationNodes { get; set; } = [];

    public ICollection<OrchestrationRelation> OrchestrationRelations { get; set; } = [];
}
