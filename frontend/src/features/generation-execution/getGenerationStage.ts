import { GENERATION_PROGRESS_TEXTS, GENERATION_STAGES, PROGRESS_COMPLETE } from './constants'

export function getGenerationStage(progress: number): string {
  if (progress >= PROGRESS_COMPLETE) {
    return GENERATION_PROGRESS_TEXTS.completed
  }
  const stageIndex = Math.floor((progress / PROGRESS_COMPLETE) * GENERATION_STAGES.length)
  return GENERATION_STAGES[Math.min(stageIndex, GENERATION_STAGES.length - 1)]
}
