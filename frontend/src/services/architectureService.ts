import { useCallback, useState } from 'react'
import type { AiSelectionRequest } from '../features/ai-selection'
import type { ArchitectureResponse, GenerateArchitectureRequest } from '../features/generation-execution'
import { ApiError } from '../shared/api/ApiError'
import { getBlob, postJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'
import { createContextTimeout } from './projectContextService'

const DOWNLOAD_TIMEOUT_MS = 60_000

export type ArchitectureArtifact = 'package' | 'postman-collection'

function buildArchitecturePath(projectId: ArchitectureResponse['projectId']): string {
  return `/projects/${projectId}/architecture`
}

async function generate(
  projectId: ArchitectureResponse['projectId'],
  aiSelection: AiSelectionRequest,
  options?: RequestOptions,
): Promise<ArchitectureResponse> {
  return postJson<ArchitectureResponse, GenerateArchitectureRequest>(
    buildArchitecturePath(projectId),
    { language: null, aiSelection },
    { timeoutMs: createContextTimeout(), ...options },
  )
}

async function downloadArtifact(
  projectId: ArchitectureResponse['projectId'],
  artifact: ArchitectureArtifact,
  options?: RequestOptions,
): Promise<Blob> {
  return getBlob(`${buildArchitecturePath(projectId)}/${artifact}`, { timeoutMs: DOWNLOAD_TIMEOUT_MS, ...options })
}

export const architectureService = {
  generate,
  downloadArtifact,
}

export type GenerateArchitectureOutcome =
  | { architecture: ArchitectureResponse; error: null }
  | { architecture: null; error: Error }

export type UseGenerateArchitectureResult = {
  run: (
    projectId: ArchitectureResponse['projectId'],
    aiSelection: AiSelectionRequest,
    signal: AbortSignal,
  ) => Promise<GenerateArchitectureOutcome | null>
  status: RequestStatus
  error: Error | null
}

export function useGenerateArchitecture(): UseGenerateArchitectureResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ArchitectureResponse['projectId'],
      aiSelection: AiSelectionRequest,
      signal: AbortSignal,
    ): Promise<GenerateArchitectureOutcome | null> => {
      setStatus('loading')
      setError(null)

      try {
        const architecture = await architectureService.generate(projectId, aiSelection, { signal })
        setStatus('success')
        return { architecture, error: null }
      } catch (caught) {
        if (caught instanceof ApiError && caught.kind === 'aborted') {
          return null
        }
        const caughtError = toError(caught)
        setError(caughtError)
        setStatus('error')
        return { architecture: null, error: caughtError }
      }
    },
    [],
  )

  return { run, status, error }
}

export type UseDownloadArchitectureArtifactResult = {
  run: (projectId: ArchitectureResponse['projectId'], artifact: ArchitectureArtifact) => Promise<Blob | null>
  status: RequestStatus
  error: Error | null
}

export function useDownloadArchitectureArtifact(): UseDownloadArchitectureArtifactResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ArchitectureResponse['projectId'],
      artifact: ArchitectureArtifact,
    ): Promise<Blob | null> => {
      setStatus('loading')
      setError(null)

      try {
        const file = await architectureService.downloadArtifact(projectId, artifact)
        setStatus('success')
        return file
      } catch (caught) {
        setError(toError(caught))
        setStatus('error')
        return null
      }
    },
    [],
  )

  return { run, status, error }
}
