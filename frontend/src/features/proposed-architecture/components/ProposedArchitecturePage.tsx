import { useState, type ReactNode } from 'react'
import {
  ContextChatPanel,
  findLatestValidTurn,
  useContextHistory,
  type ContextMap,
  type ErrorTurn,
  type OrchestrationNodeResponse,
  type PlannerTurn,
} from '../../global-context'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import { findProposedEndpoints } from '../findProposedEndpoints'
import type { AssistantPanelTab } from '../types'
import { useDiagramUpdate } from '../useDiagramUpdate'
import { useModuleNotesSync } from '../useModuleNotesSync'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { AssistantPanelTabs } from './AssistantPanelTabs'
import { FlowSummaryContent } from './FlowSummaryContent'
import { ModuleDetailModal } from './ModuleDetailModal'

export type ProposedArchitecturePageProps = {
  projectId: number
  backButton: ReactNode
  onConfirmFlow: () => void
}

export function ProposedArchitecturePage({ projectId, backButton, onConfirmFlow }: ProposedArchitecturePageProps) {
  const { turns, map, status, retry, addTurn, addErrorTurn, updateNode } = useContextHistory(projectId)
  const flowSummary = findLatestValidTurn(turns)?.planner.summary ?? null
  const syncModuleNotes = useModuleNotesSync()
  const { isUpdating, startUpdate, finishUpdate } = useDiagramUpdate()
  const [openModule, setOpenModule] = useState<OrchestrationNodeResponse | null>(null)
  const [activeTab, setActiveTab] = useState<AssistantPanelTab>('chat')
  const tabs = <AssistantPanelTabs activeTab={activeTab} onTabChange={setActiveTab} />

  function handleTurnAdded(turn: PlannerTurn, nextMap: ContextMap): void {
    const previousMap = map
    addTurn(turn, nextMap)
    finishUpdate(JSON.stringify(previousMap) !== JSON.stringify(nextMap))
    void syncModuleNotes(projectId, previousMap, nextMap).then((updatedNodes) => updatedNodes.forEach(updateNode))
  }

  function handleErrorTurnAdded(turn: ErrorTurn): void {
    addErrorTurn(turn)
    finishUpdate(false)
  }

  function handleConfigSaved(node: OrchestrationNodeResponse): void {
    updateNode(node)
    setOpenModule(null)
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 p-8 lg:h-full lg:grid-cols-3 lg:grid-rows-1">
      <div className="flex flex-col lg:col-span-2 lg:h-full">
        <PageHeader
          title={PROPOSED_ARCHITECTURE_PAGE_TEXTS.title}
          subtitle={PROPOSED_ARCHITECTURE_PAGE_TEXTS.subtitle}
          backButton={backButton}
          actions={
            <Button disabled={map.nodes.length === 0} onClick={onConfirmFlow}>
              {PROPOSED_ARCHITECTURE_PAGE_TEXTS.confirmFlow}
            </Button>
          }
        />
        <ArchitectureDiagram map={map} onModuleOpen={setOpenModule} isUpdating={isUpdating} />
      </div>
      <div className={activeTab === 'chat' ? 'contents' : 'hidden'}>
        <ContextChatPanel
          projectId={projectId}
          turns={turns}
          historyStatus={status}
          onHistoryRetry={retry}
          onTurnAdded={handleTurnAdded}
          onErrorTurnAdded={handleErrorTurnAdded}
          onSendStart={startUpdate}
          header={tabs}
        />
      </div>
      {activeTab === 'summary' && (
        <Card className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto p-6 lg:max-h-full">
          {tabs}
          <FlowSummaryContent flowSummary={flowSummary} endpoints={findProposedEndpoints(map)} />
        </Card>
      )}

      {openModule && (
        <ModuleDetailModal
          key={openModule.key}
          projectId={projectId}
          node={openModule}
          map={map}
          onClose={() => setOpenModule(null)}
          onConfigSaved={handleConfigSaved}
        />
      )}
    </div>
  )
}
