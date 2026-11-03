import type { ReactNode } from 'react'
import { findLatestValidTurn, useContextHistory } from '../../global-context'
import { AiAssistantPanel, ArchitectureDiagram, type AssistantPanelSide } from '../../proposed-architecture'
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
    <div className="p-8">
      <PageHeader
        title={GENERATION_PAGE_TEXTS.title}
        subtitle={GENERATION_PAGE_TEXTS.subtitle}
        backButton={backButton}
      />

      <div
        className={cn(
          'grid grid-cols-1 items-start gap-6',
          isAssistantVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
        )}
      >
        {isAssistantVisible && <AiAssistantPanel flowSummary={latestPlanner?.summary ?? null} />}
        <ArchitectureDiagram map={map} />
        <GenerationProgressPanel
          progress={progress}
          languageLabel={formatSolutionLanguage(latestPlanner?.language ?? null)}
        />
      </div>
    </div>
  )
}
