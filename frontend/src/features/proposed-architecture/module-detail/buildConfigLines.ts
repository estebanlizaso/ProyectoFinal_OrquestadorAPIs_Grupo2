import { MODULE_NOTE_PREFIXES } from '../constants'
import type { EndpointSlot, ModuleConfig } from '../types'
import { formatEndpoint } from './formatEndpoint'

function buildEndpointLine({ sourceName, endpoint }: EndpointSlot): string {
  if (sourceName === null) {
    return `${MODULE_NOTE_PREFIXES.endpoint}${formatEndpoint(endpoint)}`
  }
  return `${MODULE_NOTE_PREFIXES.endpointFrom}${sourceName}${MODULE_NOTE_PREFIXES.endpointSourceSeparator}${formatEndpoint(endpoint)}`
}

export function buildConfigLines({ endpoints, authentication }: ModuleConfig): string[] {
  const endpointLines = endpoints
    .filter(({ endpoint }) => endpoint.method !== '' && endpoint.route !== '')
    .map(buildEndpointLine)
  const authenticationLines = authentication ? [`${MODULE_NOTE_PREFIXES.authentication}${authentication}`] : []
  return [...endpointLines, ...authenticationLines]
}
