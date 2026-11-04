import type { ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import { findLatestValidTurn } from '../findLatestValidTurn'
import { useContextHistory } from '../useContextHistory'
import { ContextChatPanel } from './ContextChatPanel'
import { ContextDetailsPanel } from './ContextDetailsPanel'

export type GlobalContextPageProps = {
  projectId: number
  backButton: ReactNode
  onGenerateArchitecture: () => void
}

export function GlobalContextPage({ projectId, backButton, onGenerateArchitecture }: GlobalContextPageProps) {
  const { turns, map, addTurn, addErrorTurn } = useContextHistory(projectId)
  const latestAssumptions = findLatestValidTurn(turns)?.planner.assumptions ?? []
  const hasReadyTurn = turns.some((turn) => 'planner' in turn && turn.planner.status === 'ready')

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
            onTurnAdded={addTurn}
            onErrorTurnAdded={addErrorTurn}
          />
        </div>
        <ContextDetailsPanel nodes={map.nodes} assumptions={latestAssumptions} />
      </div>
    </div>
  )
}
