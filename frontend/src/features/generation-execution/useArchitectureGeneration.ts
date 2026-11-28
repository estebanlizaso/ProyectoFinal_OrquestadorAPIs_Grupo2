import { useEffect, useRef, useState } from 'react'
import { useAiSelection } from '../ai-selection'
import { useGenerateArchitecture } from '../../services/architectureService'
import { ContextTimeoutConfigurationError } from '../../services/projectContextService'
import { projectProgressService } from '../../services/projectProgressService'
import { ApiError } from '../../shared/api/ApiError'
import { getErrorMessage } from '../../shared/api/getErrorMessage'
import { toError } from '../../shared/lib/toError'
import { GENERATION_PROGRESS_TEXTS } from './constants'
import { FINISH_PROJECT_ERROR_MESSAGES, GENERATION_ERROR_MESSAGES } from './errorMessages'

export type GenerationPhase = 'running' | 'completed' | 'failed'

type GenerationStep = 'generate' | 'finish'

type GenerationResult = {
  attempt: number
  step: GenerationStep
  error: Error | null
}

export type UseArchitectureGenerationResult = {
  phase: GenerationPhase
  attempt: number
  errorMessage: string | null
  retry: () => void
}

function buildGenerationErrorMessage(step: GenerationStep, error: Error): string {
  if (step === 'finish') {
    return getErrorMessage(error, FINISH_PROJECT_ERROR_MESSAGES)
  }
  if (error instanceof ContextTimeoutConfigurationError) {
    return GENERATION_PROGRESS_TEXTS.invalidTimeout
  }
  return getErrorMessage(error, GENERATION_ERROR_MESSAGES)
}

async function markProjectFinished(projectId: number, signal: AbortSignal): Promise<Error | null | undefined> {
  try {
    await projectProgressService.advance(projectId, 'generation', { signal })
    return null
  } catch (caught) {
    if (caught instanceof ApiError && caught.kind === 'aborted') {
      return undefined
    }
    return toError(caught)
  }
}

export function useArchitectureGeneration(projectId: number): UseArchitectureGenerationResult {
  const ai = useAiSelection(projectId)
  const { run } = useGenerateArchitecture()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const selectionRef = useRef(ai.selection)
  /** La generación también sube a Drive: si ya salió bien, reintentar solo vuelve a marcar el proyecto como finalizado. */
  const generatedProjectIdRef = useRef<number | null>(null)
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
    async function generateAndFinish(currentSelection: NonNullable<typeof selection>): Promise<void> {
      if (generatedProjectIdRef.current !== projectId) {
        const outcome = await run(projectId, currentSelection, controller.signal)
        if (outcome === null) {
          return
        }
        if (outcome.error) {
          setResult({ attempt, step: 'generate', error: outcome.error })
          return
        }
        generatedProjectIdRef.current = projectId
      }
      const finishError = await markProjectFinished(projectId, controller.signal)
      if (finishError === undefined) {
        return
      }
      setResult({ attempt, step: 'finish', error: finishError })
    }
    void generateAndFinish(selection)
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
    return {
      phase: 'failed',
      attempt,
      errorMessage: buildGenerationErrorMessage(currentResult.step, currentResult.error),
      retry,
    }
  }
  if (currentResult) {
    return { phase: 'completed', attempt, errorMessage: null, retry }
  }
  return { phase: 'running', attempt, errorMessage: null, retry }
}
