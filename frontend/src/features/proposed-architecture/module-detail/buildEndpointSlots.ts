import type { ContextMap, OrchestrationNodeResponse } from '../../global-context'
import type { EndpointSlot, ModuleEndpoint } from '../types'
import { findIncomingRelations } from './findIncomingRelations'
import { findSavedEndpoint } from './findSavedEndpoint'
import { findSourceName } from './findSourceName'
import { parseModuleNotes } from './parseModuleNotes'
import { parseOperation } from './parseOperation'

const EMPTY_ENDPOINT: ModuleEndpoint = { method: '', route: '' }

export function buildEndpointSlots(node: OrchestrationNodeResponse, { nodes, relations }: ContextMap): EndpointSlot[] {
  const savedEndpoints = parseModuleNotes(node.userNotes).endpoints
  const nodesByKey = new Map(nodes.map((mapNode) => [mapNode.key, mapNode]))
  const incomingRelations = findIncomingRelations(node.key, relations)

  if (incomingRelations.length === 0) {
    const unlinkedEndpoints = savedEndpoints.filter(({ sourceName }) => sourceName === null)
    return unlinkedEndpoints.length > 0 ? unlinkedEndpoints : [{ sourceName: null, endpoint: EMPTY_ENDPOINT }]
  }

  return incomingRelations.map((relation) => {
    const sourceName = findSourceName(relation, nodesByKey)
    const aiEndpoint = relation.operation === null ? null : parseOperation(relation.operation)
    return { sourceName, endpoint: findSavedEndpoint(savedEndpoints, sourceName) ?? aiEndpoint ?? EMPTY_ENDPOINT }
  })
}
