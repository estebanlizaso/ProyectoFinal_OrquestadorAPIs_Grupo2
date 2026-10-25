import { MODULE_NOTE_PREFIXES } from '../constants'

function isConfigLine(line: string): boolean {
  return line.startsWith(MODULE_NOTE_PREFIXES.endpoint) || line.startsWith(MODULE_NOTE_PREFIXES.authentication)
}

export function extractRuleFromNotes(notes: string): string {
  const lines = notes.split('\n')
  let ruleLineCount = lines.length
  while (ruleLineCount > 0 && isConfigLine(lines[ruleLineCount - 1] ?? '')) {
    ruleLineCount -= 1
  }
  const rule = lines.slice(0, ruleLineCount).join('\n')
  const hasConfig = ruleLineCount < lines.length
  return hasConfig && rule.startsWith(MODULE_NOTE_PREFIXES.rule) ? rule.slice(MODULE_NOTE_PREFIXES.rule.length) : rule
}
