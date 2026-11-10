namespace OrquestadorApi.Services.AI;

public interface IAiRulesProvider
{
    string PlannerRulesJson { get; }
    string RulesJson { get; }
    string SummaryRulesJson { get; }
}
