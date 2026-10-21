using System.ComponentModel.DataAnnotations;

namespace OrquestadorApi.Configuration;

public class OrchestrationOptions
{
    public const string SectionName = "Orchestration";

    [Range(1, 50)]
    public int MaxNodes { get; set; } = 10;

    [Range(1, 20)]
    public int MaxSystemContexts { get; set; } = 5;

    [Range(1, 100)]
    public int MaxRelations { get; set; } = 15;

    [Range(1, 10)]
    public int MaxQuestions { get; set; } = 3;

    [Range(10, 1000)]
    public int MaxCodeLinesPerContext { get; set; } = 150;

    [Range(10, 5000)]
    public int MaxTotalCodeLines { get; set; } = 500;
}
