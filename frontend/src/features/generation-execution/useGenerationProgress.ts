import { useEffect, useState } from 'react'
import { PROGRESS_COMPLETE, PROGRESS_TICK_MS, PROGRESS_TIME_CONSTANT_MS, PROGRESS_WAITING_CAP } from './constants'
import type { GenerationPhase } from './useArchitectureGeneration'

type AttemptProgress = {
  attempt: number
  value: number
}

function estimateProgress(elapsedMs: number): number {
  return Math.round(PROGRESS_WAITING_CAP * (1 - Math.exp(-elapsedMs / PROGRESS_TIME_CONSTANT_MS)))
}

export function useGenerationProgress(phase: GenerationPhase, attempt: number): number {
  const [progress, setProgress] = useState<AttemptProgress>({ attempt, value: 0 })

  useEffect(() => {
    if (phase !== 'running') {
      return
    }
    const startedAt = Date.now()
    const intervalId = window.setInterval(
      () => setProgress({ attempt, value: estimateProgress(Date.now() - startedAt) }),
      PROGRESS_TICK_MS,
    )
    return () => window.clearInterval(intervalId)
  }, [phase, attempt])

  if (phase === 'completed') {
    return PROGRESS_COMPLETE
  }
  return progress.attempt === attempt ? progress.value : 0
}
