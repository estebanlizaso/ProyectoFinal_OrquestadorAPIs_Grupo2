using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OrquestadorApi.Models;

[Table("project_messages")]
public class ProjectMessage
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("project_id")]
    public int ProjectId { get; set; }

    [Required]
    [Column("human_question")]
    public required string HumanQuestion { get; set; }

    [Required]
    [Column("chat_bot", TypeName = "jsonb")]
    public required string ChatBot { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
}
