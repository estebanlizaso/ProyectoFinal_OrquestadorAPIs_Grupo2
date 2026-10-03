import { useCallback, useState } from 'react'
import { deleteProject } from '../../../services/projectsService'
import type { RequestStatus } from '../../../shared/api/RequestStatus'
import { toError } from '../../../shared/lib/toError'
import type { ProjectResponse } from '../types'

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
      await deleteProject(projectId)
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
