import type { EndpointSlot, ModuleEndpoint } from '../types'

export function findSavedEndpoint(savedEndpoints: EndpointSlot[], sourceName: string | null): ModuleEndpoint | null {
  return savedEndpoints.find((savedEndpoint) => savedEndpoint.sourceName === sourceName)?.endpoint ?? null
}
