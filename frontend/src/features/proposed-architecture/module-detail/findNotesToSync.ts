import type { ContextMap, OrchestrationNodeResponse } from '../../global-context'
import type { NodeNotesChange } from '../../../services/projectContextService'
import type { EndpointSlot } from '../types'
import { buildConfigLines } from './buildConfigLines'
import { canHaveEndpoint } from './canHaveEndpoint'
import { findIncomingRelations } from './findIncomingRelations'
import { findSourceName } from './findSourceName'
import { parseModuleNotes } from './parseModuleNotes'
import { parseOperation } from './parseOperation'

function describeIncomingOperations(nodeKey: string, { nodes, relations }: ContextMap): string {
  const nodesByKey = new Map(nodes.map((node) => [node.key, node]))
  return JSON.stringify(
    findIncomingRelations(nodeKey, relations).map((relation) => [
      findSourceName(relation, nodesByKey),
      relation.operation,
    ]),
  )
}

function buildSyncedNotes(node: OrchestrationNodeResponse, { nodes, relations }: ContextMap): string {
  const { authentication } = parseModuleNotes(node.userNotes)
  const nodesByKey = new Map(nodes.map((mapNode) => [mapNode.key, mapNode]))
  const endpoints = findIncomingRelations(node.key, relations).flatMap((relation): EndpointSlot[] => {
    const endpoint = relation.operation === null ? null : parseOperation(relation.operation)
    return endpoint ? [{ sourceName: findSourceName(relation, nodesByKey), endpoint }] : []
  })
  return buildConfigLines({ endpoints, authentication }).join('\n')
}

export function findNotesToSync(previousMap: ContextMap, nextMap: ContextMap): NodeNotesChange[] {
  return nextMap.nodes.flatMap((node): NodeNotesChange[] => {
    const hasSavedEndpoints = parseModuleNotes(node.userNotes).endpoints.length > 0
    if (!canHaveEndpoint(node) || !hasSavedEndpoints) {
      return []
    }
    const haveOperationsChanged =
      describeIncomingOperations(node.key, previousMap) !== describeIncomingOperations(node.key, nextMap)
    if (!haveOperationsChanged) {
      return []
    }
    const userNotes = buildSyncedNotes(node, nextMap)
    return userNotes === (node.userNotes ?? '') ? [] : [{ nodeKey: node.key, userNotes }]
  })
}
