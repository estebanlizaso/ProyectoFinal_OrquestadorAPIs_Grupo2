import { useCallback, useState } from 'react'
import type { GeneratedCodeResponse } from './types'

export type ContextTurn = {
  prompt: string
  generatedContent: GeneratedCodeResponse
}

export type UseContextHistoryResult = {
  turns: ContextTurn[]
  addTurn: (turn: ContextTurn) => void
}

function buildStorageKey(projectId: number): string {
  return `global-context:${projectId}`
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isGeneratedContent(value: unknown): value is GeneratedCodeResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'string' &&
    'language' in value &&
    typeof value.language === 'string' &&
    'summary' in value &&
    typeof value.summary === 'string' &&
    'questions' in value &&
    isStringList(value.questions) &&
    'plan' in value &&
    isStringList(value.plan) &&
    'code' in value &&
    (typeof value.code === 'string' || value.code === null)
  )
}

function isContextTurn(value: unknown): value is ContextTurn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'prompt' in value &&
    typeof value.prompt === 'string' &&
    'generatedContent' in value &&
    isGeneratedContent(value.generatedContent)
  )
}

function readTurns(projectId: number): ContextTurn[] {
  try {
    const storedTurns: unknown = JSON.parse(localStorage.getItem(buildStorageKey(projectId)) ?? '[]')
    return Array.isArray(storedTurns) ? storedTurns.filter(isContextTurn) : []
  } catch {
    return []
  }
}

function writeTurns(projectId: number, turns: ContextTurn[]): void {
  try {
    localStorage.setItem(buildStorageKey(projectId), JSON.stringify(turns))
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
  const [turns, setTurns] = useState<ContextTurn[]>(() => readTurns(projectId))

  const addTurn = useCallback(
    (turn: ContextTurn): void => {
      setTurns((currentTurns) => {
        const nextTurns = [...currentTurns, turn]
        writeTurns(projectId, nextTurns)
        return nextTurns
      })
    },
    [projectId],
  )

  return { turns, addTurn }
}
