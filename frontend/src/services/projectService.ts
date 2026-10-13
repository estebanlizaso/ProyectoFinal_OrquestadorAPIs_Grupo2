import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeleteProjectRequest, ProjectResponse, ProjectsResponse } from '../features/projects'
import { ApiError } from '../shared/api/ApiError'
import { deleteJson, getJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'

const PROJECTS_PATH = '/projects'

export type ProjectPage = {
  projects: ProjectResponse[]
  hasNextPage: boolean
  hasPreviousPage: boolean
}

async function getAll(search: string, page: number, options?: RequestOptions): Promise<ProjectPage> {
  const params = new URLSearchParams({ page: String(page) })
  if (search) {
    params.set('search', search)
  }
  const { body, next, prev } = await getJson<ProjectsResponse>(
    `${PROJECTS_PATH}?${params.toString()}`,
    options,
  )
  return { projects: body, hasNextPage: next !== null, hasPreviousPage: prev !== null }
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

export type UseProjectsResult = ProjectPage & {
  run: () => Promise<void>
  status: RequestStatus
  error: Error | null
}

const EMPTY_PROJECT_PAGE: ProjectPage = { projects: [], hasNextPage: false, hasPreviousPage: false }

export function useProjects(search: string, page: number): UseProjectsResult {
  const [projectPage, setProjectPage] = useState<ProjectPage>(EMPTY_PROJECT_PAGE)
  const [status, setStatus] = useState<RequestStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const [requestedParams, setRequestedParams] = useState({ search, page })

  if (requestedParams.search !== search || requestedParams.page !== page) {
    setRequestedParams({ search, page })
    setStatus('loading')
    setError(null)
  }

  const handleSuccess = useCallback((result: ProjectPage): void => {
    setProjectPage(result)
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

  const startRequest = useCallback((): Promise<void> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const isLatest = (): boolean => controllerRef.current === controller

    return projectService.getAll(search, page, { signal: controller.signal }).then(
      (result) => {
        if (isLatest()) {
          handleSuccess(result)
        }
      },
      (caught: unknown) => {
        if (isLatest()) {
          handleFailure(caught)
        }
      },
    )
  }, [search, page, handleSuccess, handleFailure])

  const run = useCallback(async (): Promise<void> => {
    setStatus('loading')
    setError(null)
    await startRequest()
  }, [startRequest])

  useEffect(() => {
    void startRequest()
    return () => controllerRef.current?.abort()
  }, [startRequest])

  return { ...projectPage, run, status, error }
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