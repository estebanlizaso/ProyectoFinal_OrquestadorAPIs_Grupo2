import { isAiSelection } from './selection'
import type { AiSelectionRequest } from './types'

function storageKey(projectId: number): string {
  return `ai-selection:${projectId}`
}

export type StoredSelection =
  | { status: 'missing' }
  | { status: 'valid'; selection: AiSelectionRequest }
  | { status: 'invalid' }
  | { status: 'unavailable' }

export function readSelection(projectId: number): StoredSelection {
  let stored: string | null
  try {
    stored = sessionStorage.getItem(storageKey(projectId))
  } catch {
    return { status: 'unavailable' }
  }
  if (stored === null) return { status: 'missing' }
  try {
    const parsed: unknown = JSON.parse(stored)
    return isAiSelection(parsed) ? { status: 'valid', selection: parsed } : { status: 'invalid' }
  } catch {
    return { status: 'invalid' }
  }
}

export function writeSelection(projectId: number, selection: AiSelectionRequest): boolean {
  try {
    sessionStorage.setItem(storageKey(projectId), JSON.stringify(selection))
    return true
  } catch {
    return false
  }
}

export function clearAiSelection(projectId: number): boolean {
  try {
    sessionStorage.removeItem(storageKey(projectId))
    return true
  } catch {
    return false
  }
}
