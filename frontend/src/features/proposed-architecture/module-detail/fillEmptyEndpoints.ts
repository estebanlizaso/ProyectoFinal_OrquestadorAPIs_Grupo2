import type { OrchestrationRelationResponse } from '../../global-context'
import type { ModuleConfig, ModuleEndpoint } from '../types'
import { findIncomingRelations } from './findIncomingRelations'
import { parseOperation } from './parseOperation'

function isEmptyEndpoint({ method, route }: ModuleEndpoint): boolean {
  return method === '' || route === ''
}

export function fillEmptyEndpoints(
  config: ModuleConfig,
  nodeKey: string,
  relations: OrchestrationRelationResponse[],
): ModuleConfig {
  const incomingRelations = findIncomingRelations(nodeKey, relations)
  const endpoints = config.endpoints.map((slot, position) => {
    const hasLaterSavedEndpoint = config.endpoints
      .slice(position + 1)
      .some((laterSlot) => laterSlot.sourceName === slot.sourceName && !isEmptyEndpoint(laterSlot.endpoint))
    const operation = incomingRelations[position]?.operation ?? null
    const aiEndpoint = operation === null ? null : parseOperation(operation)
    return isEmptyEndpoint(slot.endpoint) && hasLaterSavedEndpoint && aiEndpoint ? { ...slot, endpoint: aiEndpoint } : slot
  })
  return { ...config, endpoints }
}
