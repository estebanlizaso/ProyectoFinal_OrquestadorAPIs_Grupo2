import { useCallback, useEffect, useState } from 'react'
import type { AiModelsResponse } from '../features/ai-selection'
import { isAiModelsResponse } from '../features/ai-selection/selection'
import { ApiError } from '../shared/api/ApiError'
import { getJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'

async function getModels(options?: RequestOptions): Promise<AiModelsResponse> {
  const response = await getJson<unknown>('/ai/models', options)
  if (!isAiModelsResponse(response)) {
    throw new Error('El catálogo de modelos de IA no tiene el formato esperado.')
  }
  return response
}

export const aiModelsService = { getModels }

export function useAiModels(onLoaded: (catalog: AiModelsResponse) => void): {
  catalog: AiModelsResponse | null
  status: RequestStatus
  error: Error | null
  retry: () => void
} {
  const [catalog, setCatalog] = useState<AiModelsResponse | null>(null)
  const [status, setStatus] = useState<RequestStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setCatalog(null)
    setAttempt((current) => current + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    aiModelsService.getModels({ signal: controller.signal }).then(
      (data) => {
        if (controller.signal.aborted) return
        onLoaded(data)
        setCatalog(data)
        setStatus('success')
      },
      (caught: unknown) => {
        if (controller.signal.aborted || (caught instanceof ApiError && caught.kind === 'aborted')) return
        setError(toError(caught))
        setStatus('error')
      },
    )
    return () => controller.abort()
  }, [attempt, onLoaded])

  return { catalog, status, error, retry }
}
