import type { OrchestrationNodeResponse, OrchestrationRelationResponse } from '../../global-context'
import { findSourceName } from './findSourceName'

export function findRelationOccurrence(
  relation: OrchestrationRelationResponse,
  incomingRelations: OrchestrationRelationResponse[],
  nodesByKey: Map<string, OrchestrationNodeResponse>,
): number {
  const sourceName = findSourceName(relation, nodesByKey)
  return incomingRelations
    .slice(0, incomingRelations.indexOf(relation))
    .filter((previousRelation) => findSourceName(previousRelation, nodesByKey) === sourceName).length
}
