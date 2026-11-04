import type { OrchestrationNodeResponse, OrchestrationRelationResponse } from '../../global-context'
import { findSavedEndpoint } from './findSavedEndpoint'
import { findSourceName } from './findSourceName'
import { formatEndpoint } from './formatEndpoint'
import { parseModuleNotes } from './parseModuleNotes'

export function findRelationOperation(
  relation: OrchestrationRelationResponse,
  nodesByKey: Map<string, OrchestrationNodeResponse>,
): string | null {
  const target = nodesByKey.get(relation.to)
  const savedEndpoints = target ? parseModuleNotes(target.userNotes).endpoints : []
  const savedEndpoint = findSavedEndpoint(savedEndpoints, findSourceName(relation, nodesByKey))
  return savedEndpoint ? formatEndpoint(savedEndpoint) : relation.operation
}
