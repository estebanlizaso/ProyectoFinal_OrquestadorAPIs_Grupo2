import { useCallback, useState } from 'react'
import type {
  CreateProjectContextRequest,
  InitialProjectPromptResponse,
  OrchestrationNodeResponse,
  ProjectContextResponse,
  UpdateOrchestrationNodeRequest,
} from '../features/global-context'
import { getJson, patchJson, postJson, type RequestOptions } from '../shared/api/httpClient'
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

async function getInitialPrompt(
  projectId: ProjectContextResponse['projectId'],
  options?: RequestOptions,
): Promise<string> {
  const { initialPrompt } = await getJson<InitialProjectPromptResponse>(buildContextPath(projectId), options)
  return initialPrompt
}

async function updateNodeNotes(
  projectId: ProjectContextResponse['projectId'],
  nodeKey: OrchestrationNodeResponse['key'],
  userNotes: string,
  options?: RequestOptions,
): Promise<OrchestrationNodeResponse> {
  return patchJson<OrchestrationNodeResponse, UpdateOrchestrationNodeRequest>(
    `${buildContextPath(projectId)}/nodes/${encodeURIComponent(nodeKey)}`,
    { userNotes },
    options,
  )
}

export const projectContextService = {
  create,
  getInitialPrompt,
  updateNodeNotes,
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

export type UseInitialPromptResult = {
  run: (projectId: ProjectContextResponse['projectId']) => Promise<string | null>
  status: RequestStatus
  error: Error | null
}

export function useInitialPrompt(): UseInitialPromptResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(async (projectId: ProjectContextResponse['projectId']): Promise<string | null> => {
    setStatus('loading')
    setError(null)

    try {
      const prompt = await projectContextService.getInitialPrompt(projectId)
      setStatus('success')
      return prompt
    } catch (caught) {
      setError(toError(caught))
      setStatus('error')
      return null
    }
  }, [])

  return { run, status, error }
}
export type UseSaveNodeRuleResult = {
  run: (
    projectId: ProjectContextResponse['projectId'],
    nodeKey: OrchestrationNodeResponse['key'],
    rule: string,
    prompt: string,
  ) => Promise<ProjectContextResponse | null>
  status: RequestStatus
  error: Error | null
}

export function useSaveNodeRule(): UseSaveNodeRuleResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ProjectContextResponse['projectId'],
      nodeKey: OrchestrationNodeResponse['key'],
      rule: string,
      prompt: string,
    ): Promise<ProjectContextResponse | null> => {
      setStatus('loading')
      setError(null)

      try {
        await projectContextService.updateNodeNotes(projectId, nodeKey, rule)
        const updatedContext = await projectContextService.create(projectId, prompt)
        setStatus('success')
        return updatedContext
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
