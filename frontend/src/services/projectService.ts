import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeleteProjectRequest, ProjectResponse, ProjectsResponse } from '../features/projects'
import { ApiError } from '../shared/api/ApiError'
import { deleteJson, getJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/RequestStatus'
import { toError } from '../shared/lib/toError'

const PROJECTS_PATH = '/projects'

async function getAll(options?: RequestOptions): Promise<ProjectResponse[]> {
  const { body } = await getJson<ProjectsResponse>(PROJECTS_PATH, options)
  return body
}

async function deleteById(
  projectId: ProjectResponse['projectId'],
  options?: RequestOptions,
): Promise<void> {
  await deleteJson<undefined, DeleteProjectRequest>(PROJECTS_PATH, { projectId }, options)
}

export const projectService = {
  getAll,
  delete: deleteById,
}

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
    return projectService.getAll({ signal: controller.signal })
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

export type UseDeleteProjectResult = {
  run: (projectId: ProjectResponse['projectId']) => Promise<boolean>
  status: RequestStatus
  error: Error | null
}

export function useDeleteProject(): UseDeleteProjectResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(async (projectId: ProjectResponse['projectId']): Promise<boolean> => {
    setStatus('loading')
    setError(null)

    try {
      await projectService.delete(projectId)
      setStatus('success')
      return true
    } catch (caught) {
      setError(toError(caught))
      setStatus('error')
      return false
    }
  }, [])

  return { run, status, error }
}
