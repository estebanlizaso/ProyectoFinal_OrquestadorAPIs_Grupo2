import { useCallback, useState } from 'react'
import type { CreateProjectContextRequest, ProjectContextResponse } from '../features/global-context'
import { postJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'

const CREATE_CONTEXT_TIMEOUT_MS = 65_000

function buildContextPath(projectId: ProjectContextResponse['projectId']): string {
  return `/projects/${projectId}/context`
}

async function create(
  projectId: ProjectContextResponse['projectId'],
  prompt: string,
  options?: RequestOptions,
): Promise<ProjectContextResponse> {
  return postJson<ProjectContextResponse, CreateProjectContextRequest>(
    buildContextPath(projectId),
    { prompt },
    { timeoutMs: CREATE_CONTEXT_TIMEOUT_MS, ...options },
  )
}

export const projectContextService = {
  create,
}

export type UseCreateProjectContextResult = {
  context: ProjectContextResponse | null
  run: (projectId: ProjectContextResponse['projectId'], prompt: string) => Promise<ProjectContextResponse | null>
  status: RequestStatus
  error: Error | null
}

export function useCreateProjectContext(): UseCreateProjectContextResult {
  const [context, setContext] = useState<ProjectContextResponse | null>(null)
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ProjectContextResponse['projectId'],
      prompt: string,
    ): Promise<ProjectContextResponse | null> => {
      setStatus('loading')
      setError(null)

      try {
        const createdContext = await projectContextService.create(projectId, prompt)
        setContext(createdContext)
        setStatus('success')
        return createdContext
      } catch (caught) {
        setError(toError(caught))
        setStatus('error')
        return null
      }
    },
    [],
  )

  return { context, run, status, error }
}
