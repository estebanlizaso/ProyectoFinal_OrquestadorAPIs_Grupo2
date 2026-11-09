import type { OrchestrationNodeResponse, OrchestrationRelationResponse } from '../../global-context'
import { findIncomingRelations } from './findIncomingRelations'
import { findRelationOccurrence } from './findRelationOccurrence'
import { findSavedEndpoint } from './findSavedEndpoint'
import { findSourceName } from './findSourceName'
import { formatEndpoint } from './formatEndpoint'
import { parseModuleNotes } from './parseModuleNotes'

export function findRelationOperation(
  relation: OrchestrationRelationResponse,
  relations: OrchestrationRelationResponse[],
  nodesByKey: Map<string, OrchestrationNodeResponse>,
): string | null {
  const target = nodesByKey.get(relation.to)
  const savedEndpoints = target ? parseModuleNotes(target.userNotes).endpoints : []
  const occurrence = findRelationOccurrence(relation, findIncomingRelations(relation.to, relations), nodesByKey)
  const savedEndpoint = findSavedEndpoint(savedEndpoints, findSourceName(relation, nodesByKey), occurrence)
  return savedEndpoint ? formatEndpoint(savedEndpoint) : relation.operation
}
