import { useCallback, useEffect, useRef, useState } from 'react'
import { getProjects } from '../../../services/projectsService'
import { ApiError } from '../../../shared/api/ApiError'
import type { RequestStatus } from '../../../shared/api/RequestStatus'
import { toError } from '../../../shared/lib/toError'
import type { ProjectResponse } from '../types'

export type UseProjectsResult = {
  projects: ProjectResponse[]
  run: () => Promise<void>
  status: RequestStatus
  error: Error | null
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [status, setStatus] = useState<RequestStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const handleSuccess = useCallback((result: ProjectResponse[]): void => {
    setProjects(result)
    setError(null)
    setStatus('success')
  }, [])

  const handleFailure = useCallback((caught: unknown): void => {
    if (caught instanceof ApiError && caught.kind === 'aborted') {
      return
    }
    setError(toError(caught))
    setStatus('error')
  }, [])

  const startRequest = useCallback((): Promise<ProjectResponse[]> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    return getProjects({ signal: controller.signal })
  }, [])

  const run = useCallback(async (): Promise<void> => {
    setStatus('loading')
    setError(null)
    await startRequest().then(handleSuccess, handleFailure)
  }, [startRequest, handleSuccess, handleFailure])

  useEffect(() => {
    startRequest().then(handleSuccess, handleFailure)
    return () => controllerRef.current?.abort()
  }, [startRequest, handleSuccess, handleFailure])

  return { projects, run, status, error }
}
