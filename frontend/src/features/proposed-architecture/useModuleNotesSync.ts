import { useCallback } from 'react'
import type { ContextMap, OrchestrationNodeResponse } from '../global-context'
import { useSyncNodeNotes } from '../../services/projectContextService'
import { findNotesToSync } from './module-detail/findNotesToSync'

export type SyncModuleNotes = (
  projectId: number,
  previousMap: ContextMap,
  nextMap: ContextMap,
) => Promise<OrchestrationNodeResponse[]>

export function useModuleNotesSync(): SyncModuleNotes {
  const { run } = useSyncNodeNotes()

  return useCallback(
    async (projectId: number, previousMap: ContextMap, nextMap: ContextMap): Promise<OrchestrationNodeResponse[]> => {
      const changes = findNotesToSync(previousMap, nextMap)
      return changes.length === 0 ? [] : run(projectId, changes)
    },
    [run],
  )
}
