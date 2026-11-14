import type { ReactNode } from 'react'
import { findLatestValidTurn, useContextHistory } from '../../global-context'
import {
  ArchitectureDiagram,
  findProposedEndpoints,
  FlowSummaryPanel,
  type AssistantPanelSide,
} from '../../proposed-architecture'
import { cn } from '../../../shared/lib/cn'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GENERATION_DURATION_MS, GENERATION_PAGE_TEXTS } from '../constants'
import { formatSolutionLanguage } from '../formatSolutionLanguage'
import { useSimulatedProgress } from '../useSimulatedProgress'
import { GenerationProgressPanel } from './GenerationProgressPanel'

export type GenerationExecutionPageProps = {
  projectId: number
  backButton: ReactNode
  assistantSide: AssistantPanelSide
}

export function GenerationExecutionPage({
  projectId,
  backButton,
  assistantSide,
}: GenerationExecutionPageProps) {
  const { turns, map } = useContextHistory(projectId)
  const latestPlanner = findLatestValidTurn(turns)?.planner ?? null
  const progress = useSimulatedProgress(GENERATION_DURATION_MS)
  const isAssistantVisible = assistantSide === 'left'

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6 p-8 lg:h-full lg:grid-rows-1',
        isAssistantVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      )}
    >
      {isAssistantVisible && (
        <FlowSummaryPanel flowSummary={latestPlanner?.summary ?? null} endpoints={findProposedEndpoints(map)} />
      )}
      <div className="flex flex-col lg:col-span-2 lg:h-full">
        <PageHeader
          title={GENERATION_PAGE_TEXTS.title}
          subtitle={GENERATION_PAGE_TEXTS.subtitle}
          backButton={backButton}
        />
        <ArchitectureDiagram map={map} />
      </div>
      <GenerationProgressPanel
        progress={progress}
        languageLabel={formatSolutionLanguage(latestPlanner?.language ?? null)}
      />
    </div>
  )
}
