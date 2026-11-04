import { useState, type ReactNode } from 'react'
import {
  ContextChatPanel,
  findLatestValidTurn,
  useContextHistory,
  type ContextMap,
  type OrchestrationNodeResponse,
  type PlannerTurn,
} from '../../global-context'
import { cn } from '../../../shared/lib/cn'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { AssistantPanelSide } from '../types'
import { useModuleNotesSync } from '../useModuleNotesSync'
import { AiAssistantPanel } from './AiAssistantPanel'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { ModuleDetailModal } from './ModuleDetailModal'

export type ProposedArchitecturePageProps = {
  projectId: number
  backButton: ReactNode
  assistantSide: AssistantPanelSide
  onConfirmFlow: () => void
}

export function ProposedArchitecturePage({
  projectId,
  backButton,
  assistantSide,
  onConfirmFlow,
}: ProposedArchitecturePageProps) {
  const { turns, map, addTurn, addErrorTurn, updateNode } = useContextHistory(projectId)
  const flowSummary = findLatestValidTurn(turns)?.planner.summary ?? null
  const syncModuleNotes = useModuleNotesSync()
  const [openModule, setOpenModule] = useState<OrchestrationNodeResponse | null>(null)
  const isAssistantVisible = assistantSide === 'left'

  function handleTurnAdded(turn: PlannerTurn, nextMap: ContextMap): void {
    const previousMap = map
    addTurn(turn, nextMap)
    void syncModuleNotes(projectId, previousMap, nextMap).then((updatedNodes) => updatedNodes.forEach(updateNode))
  }

  function handleConfigSaved(node: OrchestrationNodeResponse): void {
    updateNode(node)
    setOpenModule(null)
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6 p-8 lg:h-full lg:grid-rows-1',
        isAssistantVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      )}
    >
      {isAssistantVisible && <AiAssistantPanel flowSummary={flowSummary} />}
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
        <ArchitectureDiagram map={map} onModuleOpen={setOpenModule} />
      </div>
      <ContextChatPanel
        projectId={projectId}
        turns={turns}
        onTurnAdded={handleTurnAdded}
        onErrorTurnAdded={addErrorTurn}
      />

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
