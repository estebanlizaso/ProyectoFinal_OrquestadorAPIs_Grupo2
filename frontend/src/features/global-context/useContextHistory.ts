import { useCallback, useMemo, useState } from 'react'
import { useProjectContextMap, useProjectMessages } from '../../services/projectContextService'
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
  errorTurns: ErrorTurn[]
}

export type UseContextHistoryResult = {
  turns: ContextTurn[]
  map: ContextMap
  status: RequestStatus
  mapStatus: RequestStatus
  retry: () => void
  addTurn: (turn: PlannerTurn, map: ContextMap) => void
  addErrorTurn: (turn: ErrorTurn) => void
  updateNode: (node: OrchestrationNodeResponse) => void
}

const EMPTY_STORED_CONTEXT: StoredContext = { errorTurns: [] }

function buildStorageKey(projectId: number): string {
  return `global-context:${projectId}`
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
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

function readStoredContext(projectId: number): StoredContext {
  try {
    const storedContext: unknown = JSON.parse(localStorage.getItem(buildStorageKey(projectId)) ?? 'null')
    if (!isObject(storedContext)) {
      return EMPTY_STORED_CONTEXT
    }
    return {
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

function combineStatus(first: RequestStatus, second: RequestStatus): RequestStatus {
  if (first === 'error' || second === 'error') {
    return 'error'
  }
  return first === 'loading' || second === 'loading' ? 'loading' : first
}

function replaceNode(map: ContextMap, node: OrchestrationNodeResponse): ContextMap {
  const nodes = map.nodes.map((currentNode) => (currentNode.key === node.key ? node : currentNode))
  return { ...map, nodes }
}

export function useContextHistory(projectId: number): UseContextHistoryResult {
  const { messages, status: messagesStatus, run: runMessages } = useProjectMessages(projectId)
  const { map: loadedMap, status: mapStatus, run: runMap } = useProjectContextMap(projectId)
  const [storedContext, setStoredContext] = useState<StoredContext>(() => readStoredContext(projectId))
  const [addedTurns, setAddedTurns] = useState<PlannerTurn[]>([])
  const [changedMap, setChangedMap] = useState<ContextMap | null>(null)
  const map = changedMap ?? loadedMap

  const turns = useMemo(
    () => sortByCreatedAt([...messages.map(toPlannerTurn), ...addedTurns, ...storedContext.errorTurns]),
    [messages, addedTurns, storedContext.errorTurns],
  )

  const retry = useCallback((): void => {
    setAddedTurns([])
    setChangedMap(null)
    void runMessages()
    void runMap()
  }, [runMessages, runMap])

  const addTurn = useCallback((turn: PlannerTurn, nextMap: ContextMap): void => {
    setAddedTurns((currentTurns) => [...currentTurns, turn])
    setChangedMap(nextMap)
  }, [])

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
      setChangedMap((currentMap) => replaceNode(currentMap ?? loadedMap, node))
    },
    [loadedMap],
  )

  return {
    turns,
    map,
    status: combineStatus(messagesStatus, mapStatus),
    mapStatus,
    retry,
    addTurn,
    addErrorTurn,
    updateNode,
  }
}
