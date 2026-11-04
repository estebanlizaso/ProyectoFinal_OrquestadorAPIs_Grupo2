import type { OrchestrationRelationResponse } from '../../global-context'

export function findIncomingRelations(
  nodeKey: string,
  relations: OrchestrationRelationResponse[],
): OrchestrationRelationResponse[] {
  return relations
    .filter((relation) => relation.to === nodeKey && relation.from !== nodeKey)
    .toSorted((first, second) => first.sortOrder - second.sortOrder)
}
