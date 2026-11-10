import { SOLUTION_LANGUAGE_LABELS } from './constants'

export function formatSolutionLanguage(language: string | null): string | null {
  if (!language) {
    return null
  }
  return SOLUTION_LANGUAGE_LABELS[language.toLowerCase()] ?? language
}
