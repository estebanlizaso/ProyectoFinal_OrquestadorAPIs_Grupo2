import { buildConfigLines } from './buildConfigLines'
import { MODULE_NOTE_PREFIXES } from '../constants'
import type { ModuleConfig } from '../types'

export function buildModuleNotes(rule: string, config: ModuleConfig | null): string {
  const configLines = buildConfigLines(config)

  if (configLines.length === 0) {
    return rule
  }
  return [`${MODULE_NOTE_PREFIXES.rule}${rule}`, ...configLines].join('\n')
}
