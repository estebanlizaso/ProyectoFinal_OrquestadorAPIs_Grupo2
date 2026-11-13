import { useCallback, useState } from 'react'
import { useAiModels } from '../../services/aiModelsService'
import { resolveSelection } from './selection'
import { readSelection, writeSelection } from './storage'
import type { AiModelsResponse, AiSelectionRequest } from './types'

export function useAiSelection(projectId: number) {
  const [stored, setStored] = useState(() => readSelection(projectId))
  const [storageUnavailable, setStorageUnavailable] = useState(stored.status === 'unavailable')
  const rememberDefault = useCallback((loadedCatalog: AiModelsResponse): void => {
    if (readSelection(projectId).status !== 'missing') return
    const initial = resolveSelection(loadedCatalog.defaultSelection, loadedCatalog)
    if (!initial) return
    setStored({ status: 'valid', selection: initial })
    setStorageUnavailable(!writeSelection(projectId, initial))
  }, [projectId])
  const { catalog, status, error, retry } = useAiModels(rememberDefault)
  const savedSelection = stored.status === 'valid' ? stored.selection : null
  const candidate = stored.status === 'missing' || stored.status === 'unavailable'
    ? catalog?.defaultSelection ?? null
    : savedSelection
  const selection = catalog ? resolveSelection(candidate, catalog) : null
  const selectionUnavailable = catalog !== null &&
    (stored.status === 'invalid' || (stored.status === 'valid' && selection === null))

  function select(next: AiSelectionRequest): void {
    if (!catalog) return
    const resolved = resolveSelection(next, catalog)
    if (!resolved) return
    setStored({ status: 'valid', selection: resolved })
    setStorageUnavailable(!writeSelection(projectId, resolved))
  }

  return { catalog, status, error, retry, selection, select, selectionUnavailable, storageUnavailable }
}
