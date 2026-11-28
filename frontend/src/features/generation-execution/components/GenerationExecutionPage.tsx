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
import { GENERATION_PAGE_TEXTS } from '../constants'
import { formatSolutionLanguage } from '../formatSolutionLanguage'
import { useArchitectureGeneration } from '../useArchitectureGeneration'
import { useGenerationProgress } from '../useGenerationProgress'
import { useResultsTransition } from '../useResultsTransition'
import { GenerationProgressPanel } from './GenerationProgressPanel'

export type GenerationExecutionPageProps = {
  projectId: number
  backButton: ReactNode
  assistantSide: AssistantPanelSide
  onCompleted: () => void
}

export function GenerationExecutionPage({
  projectId,
  backButton,
  assistantSide,
  onCompleted,
}: GenerationExecutionPageProps) {
  const { turns, map, mapStatus, retry: retryMap } = useContextHistory(projectId)
  const latestPlanner = findLatestValidTurn(turns)?.planner ?? null
  const { phase, attempt, errorMessage, retry } = useArchitectureGeneration(projectId)
  const progress = useGenerationProgress(phase, attempt)
  const isLeaving = useResultsTransition(phase === 'completed', onCompleted)
  const isAssistantVisible = assistantSide === 'left'

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-start gap-6 p-8 transition-opacity duration-300 lg:h-full lg:grid-rows-1',
        isLeaving && 'opacity-0',
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
          backButton={phase === 'failed' ? backButton : null}
        />
        <ArchitectureDiagram map={map} status={mapStatus} onRetry={retryMap} />
      </div>
      <GenerationProgressPanel
        progress={progress}
        phase={phase}
        languageLabel={formatSolutionLanguage(latestPlanner?.language ?? null)}
        errorMessage={errorMessage}
        onRetry={retry}
      />
    </div>
  )
}
