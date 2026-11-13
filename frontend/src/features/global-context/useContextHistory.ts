import { useCallback, useMemo, useState } from 'react'
import { useProjectMessages } from '../../services/projectContextService'
import type { RequestStatus } from '../../shared/api/requestStatus'
import type { OrchestrationNodeResponse, OrchestrationRelationResponse, PlannerContentResponse, ProjectMessageResponse } from './types'

export type PlannerTurn = {
  prompt: string
  planner: PlannerContentResponse
  createdAt: string
}

export type ErrorTurn = {
  prompt: string
  errorMessage: string
  createdAt: string
}

export type ContextTurn = PlannerTurn | ErrorTurn

export type ContextMap = {
  nodes: OrchestrationNodeResponse[]
  relations: OrchestrationRelationResponse[]
}

type StoredContext = {
  map: ContextMap
  errorTurns: ErrorTurn[]
}

export type UseContextHistoryResult = {
  turns: ContextTurn[]
  map: ContextMap
  status: RequestStatus
  retry: () => void
  addTurn: (turn: PlannerTurn, map: ContextMap) => void
  addErrorTurn: (turn: ErrorTurn) => void
  updateNode: (node: OrchestrationNodeResponse) => void
}

const EMPTY_STORED_CONTEXT: StoredContext = { map: { nodes: [], relations: [] }, errorTurns: [] }

function buildStorageKey(projectId: number): string {
  return `global-context:${projectId}`
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isOrchestrationNode(value: unknown): value is OrchestrationNodeResponse {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'number' &&
    'key' in value &&
    typeof value.key === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'description' in value &&
    isNullableString(value.description) &&
    'kind' in value &&
    typeof value.kind === 'string' &&
    'role' in value &&
    isNullableString(value.role) &&
    'responsibility' in value &&
    isNullableString(value.responsibility) &&
    'status' in value &&
    typeof value.status === 'string' &&
    'userNotes' in value &&
    isNullableString(value.userNotes) &&
    'isActive' in value &&
    typeof value.isActive === 'boolean' &&
    'sortOrder' in value &&
    typeof value.sortOrder === 'number'
  )
}

function isOrchestrationRelation(value: unknown): value is OrchestrationRelationResponse {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'number' &&
    'from' in value &&
    typeof value.from === 'string' &&
    'to' in value &&
    typeof value.to === 'string' &&
    'label' in value &&
    typeof value.label === 'string' &&
    'operation' in value &&
    isNullableString(value.operation) &&
    'description' in value &&
    isNullableString(value.description) &&
    'kind' in value &&
    isNullableString(value.kind) &&
    'sortOrder' in value &&
    typeof value.sortOrder === 'number'
  )
}

function isErrorTurn(value: unknown): value is ErrorTurn {
  return (
    isObject(value) &&
    'prompt' in value &&
    typeof value.prompt === 'string' &&
    'errorMessage' in value &&
    typeof value.errorMessage === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}

function isContextMap(value: unknown): value is ContextMap {
  return (
    isObject(value) &&
    'nodes' in value &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isOrchestrationNode) &&
    'relations' in value &&
    Array.isArray(value.relations) &&
    value.relations.every(isOrchestrationRelation)
  )
}

function readStoredContext(projectId: number): StoredContext {
  try {
    const storedContext: unknown = JSON.parse(localStorage.getItem(buildStorageKey(projectId)) ?? 'null')
    if (!isObject(storedContext)) {
      return EMPTY_STORED_CONTEXT
    }
    return {
      map: 'map' in storedContext && isContextMap(storedContext.map) ? storedContext.map : EMPTY_STORED_CONTEXT.map,
      errorTurns:
        'errorTurns' in storedContext &&
        Array.isArray(storedContext.errorTurns) &&
        storedContext.errorTurns.every(isErrorTurn)
          ? storedContext.errorTurns
          : [],
    }
  } catch {
    return EMPTY_STORED_CONTEXT
  }
}

function writeStoredContext(projectId: number, storedContext: StoredContext): void {
  try {
    localStorage.setItem(buildStorageKey(projectId), JSON.stringify(storedContext))
  } catch {
    return
  }
}

export function clearContextHistory(projectId: number): void {
  try {
    localStorage.removeItem(buildStorageKey(projectId))
  } catch {
    return
  }
}

function toPlannerTurn({ humanQuestion, chatBot, createdAt }: ProjectMessageResponse): PlannerTurn {
  const { message, ...planner } = chatBot
  return { prompt: humanQuestion, planner: { ...planner, reply: message }, createdAt }
}

function sortByCreatedAt(turns: ContextTurn[]): ContextTurn[] {
  return turns.toSorted((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt))
}

export function useContextHistory(projectId: number): UseContextHistoryResult {
  const { messages, status, run } = useProjectMessages(projectId)
  const [storedContext, setStoredContext] = useState<StoredContext>(() => readStoredContext(projectId))
  const [addedTurns, setAddedTurns] = useState<PlannerTurn[]>([])

  const turns = useMemo(
    () => sortByCreatedAt([...messages.map(toPlannerTurn), ...addedTurns, ...storedContext.errorTurns]),
    [messages, addedTurns, storedContext.errorTurns],
  )

  const retry = useCallback((): void => {
    setAddedTurns([])
    void run()
  }, [run])

  const addTurn = useCallback(
    (turn: PlannerTurn, map: ContextMap): void => {
      setAddedTurns((currentTurns) => [...currentTurns, turn])
      setStoredContext((currentContext) => {
        const nextContext = { ...currentContext, map }
        writeStoredContext(projectId, nextContext)
        return nextContext
      })
    },
    [projectId],
  )

  const addErrorTurn = useCallback(
    (turn: ErrorTurn): void => {
      setStoredContext((currentContext) => {
        const nextContext = { ...currentContext, errorTurns: [...currentContext.errorTurns, turn] }
        writeStoredContext(projectId, nextContext)
        return nextContext
      })
    },
    [projectId],
  )

  const updateNode = useCallback(
    (node: OrchestrationNodeResponse): void => {
      setStoredContext((currentContext) => {
        const nodes = currentContext.map.nodes.map((currentNode) =>
          currentNode.key === node.key ? node : currentNode,
        )
        const nextContext = { ...currentContext, map: { ...currentContext.map, nodes } }
        writeStoredContext(projectId, nextContext)
        return nextContext
      })
    },
    [projectId],
  )

  return { turns, map: storedContext.map, status, retry, addTurn, addErrorTurn, updateNode }
}
