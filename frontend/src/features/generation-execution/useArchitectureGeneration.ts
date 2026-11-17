import { useEffect, useRef, useState } from 'react'
import { useAiSelection } from '../ai-selection'
import { useGenerateArchitecture } from '../../services/architectureService'
import { ContextTimeoutConfigurationError } from '../../services/projectContextService'
import { getErrorMessage } from '../../shared/api/getErrorMessage'
import { GENERATION_PROGRESS_TEXTS } from './constants'
import { GENERATION_ERROR_MESSAGES } from './errorMessages'

export type GenerationPhase = 'running' | 'completed' | 'failed'

type GenerationResult = {
  attempt: number
  error: Error | null
}

export type UseArchitectureGenerationResult = {
  phase: GenerationPhase
  attempt: number
  errorMessage: string | null
  retry: () => void
}

function buildGenerationErrorMessage(error: Error): string {
  if (error instanceof ContextTimeoutConfigurationError) {
    return GENERATION_PROGRESS_TEXTS.invalidTimeout
  }
  return getErrorMessage(error, GENERATION_ERROR_MESSAGES)
}

export function useArchitectureGeneration(projectId: number): UseArchitectureGenerationResult {
  const ai = useAiSelection(projectId)
  const { run } = useGenerateArchitecture()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const selectionRef = useRef(ai.selection)
  const hasSelection = ai.selection !== null

  useEffect(() => {
    selectionRef.current = ai.selection
  })

  useEffect(() => {
    const selection = selectionRef.current
    if (!hasSelection || selection === null) {
      return
    }
    const controller = new AbortController()
    void run(projectId, selection, controller.signal).then((outcome) => {
      if (outcome === null) {
        return
      }
      setResult({ attempt, error: outcome.error })
    })
    return () => controller.abort()
  }, [projectId, attempt, hasSelection, run])

  const isMissingSelection = ai.status === 'success' && !hasSelection
  const currentResult = result?.attempt === attempt ? result : null

  function retry(): void {
    if (ai.status === 'error') {
      ai.retry()
      return
    }
    setAttempt((currentAttempt) => currentAttempt + 1)
  }

  if (ai.status === 'error') {
    return { phase: 'failed', attempt, errorMessage: getErrorMessage(ai.error ?? new Error()), retry }
  }
  if (isMissingSelection) {
    return { phase: 'failed', attempt, errorMessage: GENERATION_PROGRESS_TEXTS.missingAiSelection, retry }
  }
  if (currentResult?.error) {
    return { phase: 'failed', attempt, errorMessage: buildGenerationErrorMessage(currentResult.error), retry }
  }
  if (currentResult) {
    return { phase: 'completed', attempt, errorMessage: null, retry }
  }
  return { phase: 'running', attempt, errorMessage: null, retry }
}
