import type { OrchestrationNodeResponse } from '../../global-context'
import { extractRuleFromNotes } from './extractRuleFromNotes'

export function getModuleRule({ userNotes, description }: OrchestrationNodeResponse): string {
  const savedRule = userNotes ? extractRuleFromNotes(userNotes).trim() : ''
  return savedRule === '' ? (description ?? '') : savedRule
}
