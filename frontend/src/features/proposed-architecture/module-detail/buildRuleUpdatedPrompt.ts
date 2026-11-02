import { buildConfigLines } from './buildConfigLines'
import { MODULE_DETAIL_TEXTS } from '../constants'
import type { ModuleConfig } from '../types'

export function buildRuleUpdatedPrompt(moduleName: string, rule: string, config: ModuleConfig | null): string {
  const { ruleUpdatedPromptPrefix, ruleUpdatedPromptSeparator } = MODULE_DETAIL_TEXTS
  const ruleLine = `${ruleUpdatedPromptPrefix}${moduleName}${ruleUpdatedPromptSeparator}${rule}`
  return [ruleLine, ...buildConfigLines(config)].join('\n')
}
