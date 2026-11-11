import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CreateProjectContextRequest,
  InitialProjectPromptResponse,
  OrchestrationNodeResponse,
  ProjectContextResponse,
  ProjectMessageResponse,
  UpdateOrchestrationNodeRequest,
} from '../features/global-context'
import { ApiError } from '../shared/api/ApiError'
import { getJson, patchJson, postJson, type RequestOptions } from '../shared/api/httpClient'
import type { RequestStatus } from '../shared/api/requestStatus'
import { toError } from '../shared/lib/toError'

const CREATE_CONTEXT_TIMEOUT_MS = 65_000
const MESSAGES_PAGE_SIZE = 200

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

async function getMessages(
  projectId: ProjectContextResponse['projectId'],
  offset: number,
  limit: number,
  options?: RequestOptions,
): Promise<ProjectMessageResponse[]> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  return getJson<ProjectMessageResponse[]>(`/projects/${projectId}/messages?${params.toString()}`, options)
}

async function getAllMessages(
  projectId: ProjectContextResponse['projectId'],
  options?: RequestOptions,
): Promise<ProjectMessageResponse[]> {
  const messages: ProjectMessageResponse[] = []
  let page: ProjectMessageResponse[]
  do {
    page = await getMessages(projectId, messages.length, MESSAGES_PAGE_SIZE, options)
    messages.push(...page)
  } while (page.length === MESSAGES_PAGE_SIZE)
  return messages
}

export const projectContextService = {
  create,
  getInitialPrompt,
  getAllMessages,
  updateNodeNotes,
}

export type UseProjectMessagesResult = {
  messages: ProjectMessageResponse[]
  run: () => Promise<void>
  status: RequestStatus
  error: Error | null
}

export function useProjectMessages(projectId: ProjectContextResponse['projectId']): UseProjectMessagesResult {
  const [messages, setMessages] = useState<ProjectMessageResponse[]>([])
  const [status, setStatus] = useState<RequestStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const handleSuccess = useCallback((result: ProjectMessageResponse[]): void => {
    setMessages(result)
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

  const run = useCallback(async (): Promise<void> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('loading')
    setError(null)

    try {
      const result = await projectContextService.getAllMessages(projectId, { signal: controller.signal })
      if (controllerRef.current === controller) {
        handleSuccess(result)
      }
    } catch (caught) {
      if (controllerRef.current === controller) {
        handleFailure(caught)
      }
    }
  }, [projectId, handleSuccess, handleFailure])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    projectContextService.getAllMessages(projectId, { signal: controller.signal }).then(handleSuccess, handleFailure)
    return () => controller.abort()
  }, [projectId, handleSuccess, handleFailure])

  return { messages, run, status, error }
}

export type CreateProjectContextOutcome =
  | { context: ProjectContextResponse; error: null }
  | { context: null; error: Error }

export type UseCreateProjectContextResult = {
  context: ProjectContextResponse | null
  run: (projectId: ProjectContextResponse['projectId'], prompt: string) => Promise<CreateProjectContextOutcome>
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
    ): Promise<CreateProjectContextOutcome> => {
      setStatus('loading')
      setError(null)

      try {
        const createdContext = await projectContextService.create(projectId, prompt)
        setContext(createdContext)
        setStatus('success')
        return { context: createdContext, error: null }
      } catch (caught) {
        const caughtError = toError(caught)
        setError(caughtError)
        setStatus('error')
        return { context: null, error: caughtError }
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
export type UseUpdateNodeNotesResult = {
  run: (
    projectId: ProjectContextResponse['projectId'],
    nodeKey: OrchestrationNodeResponse['key'],
    userNotes: string,
  ) => Promise<OrchestrationNodeResponse | null>
  status: RequestStatus
  error: Error | null
}

export function useUpdateNodeNotes(): UseUpdateNodeNotesResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ProjectContextResponse['projectId'],
      nodeKey: OrchestrationNodeResponse['key'],
      userNotes: string,
    ): Promise<OrchestrationNodeResponse | null> => {
      setStatus('loading')
      setError(null)

      try {
        const updatedNode = await projectContextService.updateNodeNotes(projectId, nodeKey, userNotes)
        setStatus('success')
        return updatedNode
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

export type NodeNotesChange = {
  nodeKey: OrchestrationNodeResponse['key']
  userNotes: string
}

export type UseSyncNodeNotesResult = {
  run: (
    projectId: ProjectContextResponse['projectId'],
    changes: NodeNotesChange[],
  ) => Promise<OrchestrationNodeResponse[]>
  status: RequestStatus
  error: Error | null
}

export function useSyncNodeNotes(): UseSyncNodeNotesResult {
  const [status, setStatus] = useState<RequestStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(
    async (
      projectId: ProjectContextResponse['projectId'],
      changes: NodeNotesChange[],
    ): Promise<OrchestrationNodeResponse[]> => {
      setStatus('loading')
      setError(null)
      const updatedNodes: OrchestrationNodeResponse[] = []

      try {
        for (const { nodeKey, userNotes } of changes) {
          updatedNodes.push(await projectContextService.updateNodeNotes(projectId, nodeKey, userNotes))
        }
        setStatus('success')
      } catch (caught) {
        setError(toError(caught))
        setStatus('error')
      }
      return updatedNodes
    },
    [],
  )

  return { run, status, error }
}
