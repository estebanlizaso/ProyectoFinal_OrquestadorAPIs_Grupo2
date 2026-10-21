import type { GeneratedCodeResponse } from './types'

export function isOutOfScope(generatedContent: GeneratedCodeResponse): boolean {
  return generatedContent.status === 'out_of_scope'
}
