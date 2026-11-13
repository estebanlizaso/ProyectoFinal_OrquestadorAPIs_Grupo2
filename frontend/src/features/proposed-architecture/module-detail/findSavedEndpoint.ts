import type { EndpointSlot, ModuleEndpoint } from '../types'

export function findSavedEndpoint(
  savedEndpoints: EndpointSlot[],
  sourceName: string | null,
  occurrence: number,
): ModuleEndpoint | null {
  return savedEndpoints.filter((savedEndpoint) => savedEndpoint.sourceName === sourceName)[occurrence]?.endpoint ?? null
}
