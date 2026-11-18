import { useEffect, useRef, useState } from 'react'
import { RESULTS_FADE_OUT_DELAY_MS, RESULTS_TRANSITION_DELAY_MS } from './constants'

export function useResultsTransition(isCompleted: boolean, onCompleted: () => void): boolean {
  const [isLeaving, setIsLeaving] = useState(false)
  const onCompletedRef = useRef(onCompleted)

  useEffect(() => {
    onCompletedRef.current = onCompleted
  })

  useEffect(() => {
    if (!isCompleted) {
      return
    }
    const fadeOutId = window.setTimeout(() => setIsLeaving(true), RESULTS_FADE_OUT_DELAY_MS)
    const navigateId = window.setTimeout(() => onCompletedRef.current(), RESULTS_TRANSITION_DELAY_MS)
    return () => {
      window.clearTimeout(fadeOutId)
      window.clearTimeout(navigateId)
    }
  }, [isCompleted])

  return isLeaving
}
