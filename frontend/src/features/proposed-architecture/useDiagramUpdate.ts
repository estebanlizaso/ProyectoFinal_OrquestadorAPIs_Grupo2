import { useCallback, useEffect, useRef, useState } from 'react'
import { DIAGRAM_UPDATE_REVEAL_MS } from './constants'

export type UseDiagramUpdateResult = {
  isUpdating: boolean
  startUpdate: () => void
  finishUpdate: (hasMapChanged: boolean) => void
}

export function useDiagramUpdate(): UseDiagramUpdateResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const clearRevealTimeout = useCallback((): void => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startUpdate = useCallback((): void => {
    clearRevealTimeout()
    setIsUpdating(true)
  }, [clearRevealTimeout])

  const finishUpdate = useCallback(
    (hasMapChanged: boolean): void => {
      clearRevealTimeout()
      if (!hasMapChanged) {
        setIsUpdating(false)
        return
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        setIsUpdating(false)
      }, DIAGRAM_UPDATE_REVEAL_MS)
    },
    [clearRevealTimeout],
  )

  useEffect(() => clearRevealTimeout, [clearRevealTimeout])

  return { isUpdating, startUpdate, finishUpdate }
}
