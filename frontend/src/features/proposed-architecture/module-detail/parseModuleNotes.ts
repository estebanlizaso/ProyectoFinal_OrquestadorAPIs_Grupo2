import { MODULE_NOTE_PREFIXES } from '../constants'
import type { EndpointSlot, ModuleConfig } from '../types'
import { isAuthenticationType } from './isAuthenticationType'
import { parseOperation } from './parseOperation'

function parseEndpointLine(line: string): EndpointSlot | null {
  if (line.startsWith(MODULE_NOTE_PREFIXES.endpointFrom)) {
    const content = line.slice(MODULE_NOTE_PREFIXES.endpointFrom.length)
    const separatorIndex = content.lastIndexOf(MODULE_NOTE_PREFIXES.endpointSourceSeparator)
    if (separatorIndex <= 0) {
      return null
    }
    const endpoint = parseOperation(content.slice(separatorIndex + MODULE_NOTE_PREFIXES.endpointSourceSeparator.length))
    return endpoint ? { sourceName: content.slice(0, separatorIndex), endpoint } : null
  }
  if (line.startsWith(MODULE_NOTE_PREFIXES.endpoint)) {
    const endpoint = parseOperation(line.slice(MODULE_NOTE_PREFIXES.endpoint.length))
    return endpoint ? { sourceName: null, endpoint } : null
  }
  return null
}

export function parseModuleNotes(userNotes: string | null): ModuleConfig {
  const config: ModuleConfig = { endpoints: [], authentication: '' }
  for (const line of (userNotes ?? '').split('\n').map((noteLine) => noteLine.trim())) {
    const endpointSlot = parseEndpointLine(line)
    if (endpointSlot) {
      config.endpoints.push(endpointSlot)
      continue
    }
    if (line.startsWith(MODULE_NOTE_PREFIXES.authentication)) {
      const authentication = line.slice(MODULE_NOTE_PREFIXES.authentication.length)
      config.authentication = isAuthenticationType(authentication) ? authentication : ''
    }
  }
  return config
}
