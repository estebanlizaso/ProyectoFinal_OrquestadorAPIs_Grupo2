import type { ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import { findLatestValidTurn } from '../findLatestValidTurn'
import type { OrchestrationNodeResponse } from '../types'
import { useContextHistory, type ContextMap, type PlannerTurn } from '../useContextHistory'
import { ContextChatPanel } from './ContextChatPanel'
import { ContextDetailsPanel } from './ContextDetailsPanel'

export type GlobalContextPageProps = {
  projectId: number
  backButton: ReactNode
  onGenerateArchitecture: () => void
  onMapChanged: (previousMap: ContextMap, nextMap: ContextMap) => Promise<OrchestrationNodeResponse[]>
}

export function GlobalContextPage({
  projectId,
  backButton,
  onGenerateArchitecture,
  onMapChanged,
}: GlobalContextPageProps) {
  const { turns, map, addTurn, addErrorTurn, updateNode } = useContextHistory(projectId)
  const latestAssumptions = findLatestValidTurn(turns)?.planner.assumptions ?? []
  const hasReadyTurn = turns.some((turn) => 'planner' in turn && turn.planner.status === 'ready')

  function handleTurnAdded(turn: PlannerTurn, nextMap: ContextMap): void {
    const previousMap = map
    addTurn(turn, nextMap)
    void onMapChanged(previousMap, nextMap).then((updatedNodes) => updatedNodes.forEach(updateNode))
  }

  return (
    <div className="p-8">
      <PageHeader
        title={GLOBAL_CONTEXT_PAGE_TEXTS.title}
        subtitle={GLOBAL_CONTEXT_PAGE_TEXTS.subtitle}
        backButton={backButton}
        actions={
          <Button disabled={!hasReadyTurn} onClick={onGenerateArchitecture}>
            {GLOBAL_CONTEXT_PAGE_TEXTS.generateArchitecture}
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContextChatPanel
            projectId={projectId}
            turns={turns}
            onTurnAdded={handleTurnAdded}
            onErrorTurnAdded={addErrorTurn}
          />
        </div>
        <ContextDetailsPanel nodes={map.nodes} assumptions={latestAssumptions} />
      </div>
    </div>
  )
}
