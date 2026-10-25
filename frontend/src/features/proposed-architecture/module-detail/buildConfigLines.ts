import { MODULE_NOTE_PREFIXES } from '../constants'
import type { ModuleConfig } from '../types'

export function buildConfigLines(config: ModuleConfig | null): string[] {
  const endpointLines = (config?.endpoints ?? []).map(
    ({ method, route }) => `${MODULE_NOTE_PREFIXES.endpoint}${method} ${route}`,
  )
  const authenticationLines = config?.authentication
    ? [`${MODULE_NOTE_PREFIXES.authentication}${config.authentication}`]
    : []
  return [...endpointLines, ...authenticationLines]
}
