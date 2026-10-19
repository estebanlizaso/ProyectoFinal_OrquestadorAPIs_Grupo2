namespace OrquestadorApi.Services.AI;

public interface IAiRulesProvider
{
    string RulesJson { get; }
    string SummaryRulesJson { get; }
}
