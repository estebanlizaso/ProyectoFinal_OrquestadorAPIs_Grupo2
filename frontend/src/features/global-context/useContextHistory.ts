import { useCallback, useState } from 'react'
import type { OrchestrationNodeResponse, OrchestrationRelationResponse, PlannerContentResponse } from './types'

export type ContextTurn = {
  prompt: string
  planner: PlannerContentResponse
}

export type ContextMap = {
  nodes: OrchestrationNodeResponse[]
  relations: OrchestrationRelationResponse[]
}

type ContextHistory = {
  turns: ContextTurn[]
  map: ContextMap
}

export type UseContextHistoryResult = {
  turns: ContextTurn[]
  map: ContextMap
  addTurn: (turn: ContextTurn, map: ContextMap) => void
}

const EMPTY_HISTORY: ContextHistory = { turns: [], map: { nodes: [], relations: [] } }

function buildStorageKey(projectId: number): string {
  return `global-context:${projectId}`
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isPlannerContent(value: unknown): value is PlannerContentResponse {
  return (
    isObject(value) &&
    'status' in value &&
    typeof value.status === 'string' &&
    'reply' in value &&
    typeof value.reply === 'string' &&
    'summary' in value &&
    typeof value.summary === 'string' &&
    'questions' in value &&
    isStringList(value.questions) &&
    'plan' in value &&
    isStringList(value.plan) &&
    'assumptions' in value &&
    isStringList(value.assumptions) &&
    'language' in value &&
    isNullableString(value.language)
  )
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

function isContextTurn(value: unknown): value is ContextTurn {
  return (
    isObject(value) &&
    'prompt' in value &&
    typeof value.prompt === 'string' &&
    'planner' in value &&
    isPlannerContent(value.planner)
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

function isContextHistory(value: unknown): value is ContextHistory {
  return (
    isObject(value) &&
    'turns' in value &&
    Array.isArray(value.turns) &&
    value.turns.every(isContextTurn) &&
    'map' in value &&
    isContextMap(value.map)
  )
}

function readHistory(projectId: number): ContextHistory {
  try {
    const storedHistory: unknown = JSON.parse(localStorage.getItem(buildStorageKey(projectId)) ?? 'null')
    return isContextHistory(storedHistory) ? storedHistory : EMPTY_HISTORY
  } catch {
    return EMPTY_HISTORY
  }
}

function writeHistory(projectId: number, history: ContextHistory): void {
  try {
    localStorage.setItem(buildStorageKey(projectId), JSON.stringify(history))
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

export function useContextHistory(projectId: number): UseContextHistoryResult {
  const [history, setHistory] = useState<ContextHistory>(() => readHistory(projectId))

  const addTurn = useCallback(
    (turn: ContextTurn, map: ContextMap): void => {
      setHistory((currentHistory) => {
        const nextHistory = { turns: [...currentHistory.turns, turn], map }
        writeHistory(projectId, nextHistory)
        return nextHistory
      })
    },
    [projectId],
  )

  return { turns: history.turns, map: history.map, addTurn }
}
