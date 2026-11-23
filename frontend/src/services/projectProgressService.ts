import { useCallback, useEffect, useState } from 'react'
import type { ProjectProgressResponse, ProjectResponse, ProjectStage, UpdateProjectProgressRequest } from '../features/projects'
import { ApiError } from '../shared/api/ApiError'
import { getJson, patchJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'

function buildProgressPath(projectId: ProjectResponse['projectId']): string {
  return `/projects/${projectId}/progress`
}

async function get(projectId: ProjectResponse['projectId'], options?: RequestOptions): Promise<ProjectProgressResponse> {
  return getJson<ProjectProgressResponse>(buildProgressPath(projectId), options)
}

async function advance(
  projectId: ProjectResponse['projectId'],
  stage: ProjectStage,
  options?: RequestOptions,
): Promise<ProjectProgressResponse> {
  return patchJson<ProjectProgressResponse, UpdateProjectProgressRequest>(
    buildProgressPath(projectId),
    { stage },
    options,
  )
}

export const projectProgressService = {
  get,
  advance,
}

export type UseProjectProgressResult = {
  progress: ProjectProgressResponse | null
  status: RequestStatus
  error: Error | null
  retry: () => void
}

type ProgressResult = {
  projectId: number
  attempt: number
  progress: ProjectProgressResponse | null
  error: Error | null
}

export function useProjectProgress(projectId: ProjectResponse['projectId'] | null): UseProjectProgressResult {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ProgressResult | null>(null)

  useEffect(() => {
    if (projectId === null) {
      return
    }
    const controller = new AbortController()
    projectProgressService.get(projectId, { signal: controller.signal }).then(
      (progress) => setResult({ projectId, attempt, progress, error: null }),
      (caught: unknown) => {
        if (caught instanceof ApiError && caught.kind === 'aborted') {
          return
        }
        setResult({ projectId, attempt, progress: null, error: toError(caught) })
      },
    )
    return () => controller.abort()
  }, [projectId, attempt])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])

  if (projectId === null) {
    return { progress: null, status: 'idle', error: null, retry }
  }
  const currentResult = result?.projectId === projectId && result.attempt === attempt ? result : null
  if (currentResult === null) {
    return { progress: null, status: 'loading', error: null, retry }
  }
  if (currentResult.error) {
    return { progress: null, status: 'error', error: currentResult.error, retry }
  }
  return { progress: currentResult.progress, status: 'success', error: null, retry }
}
