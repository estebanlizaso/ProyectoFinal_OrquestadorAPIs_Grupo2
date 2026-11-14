import { GENERATION_PROGRESS_TEXTS } from './constants'

export function buildSolutionStatus(languageLabel: string | null, isCompleted: boolean): string {
  const language = languageLabel ? ` ${languageLabel}` : ''
  if (isCompleted) {
    return `${GENERATION_PROGRESS_TEXTS.solutionGeneratedPrefix}${language} ${GENERATION_PROGRESS_TEXTS.solutionGeneratedSuffix}`
  }
  return `${GENERATION_PROGRESS_TEXTS.generatingSolution}${language}`
}
