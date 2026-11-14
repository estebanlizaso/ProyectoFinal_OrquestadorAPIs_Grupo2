import { useEffect, useState } from 'react'
import { PROGRESS_COMPLETE, PROGRESS_TICK_MS } from './constants'

export function useSimulatedProgress(durationMs: number): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      const elapsedRatio = (Date.now() - startedAt) / durationMs
      const nextProgress = Math.min(PROGRESS_COMPLETE, Math.round(elapsedRatio * PROGRESS_COMPLETE))
      setProgress(nextProgress)
      if (nextProgress === PROGRESS_COMPLETE) {
        window.clearInterval(intervalId)
      }
    }, PROGRESS_TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [durationMs])

  return progress
}
