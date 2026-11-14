import type { OrchestrationNodeResponse, OrchestrationRelationResponse } from '../../global-context'

export function findSourceName(
  relation: OrchestrationRelationResponse,
  nodesByKey: Map<string, OrchestrationNodeResponse>,
): string {
  return nodesByKey.get(relation.from)?.name ?? relation.from
}
