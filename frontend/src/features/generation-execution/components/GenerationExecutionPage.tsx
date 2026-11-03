import { findLatestValidTurn, useContextHistory } from '../../global-context'
import { ArchitectureDiagram } from '../../proposed-architecture'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GENERATION_DURATION_MS, GENERATION_PAGE_TEXTS } from '../constants'
import { formatSolutionLanguage } from '../formatSolutionLanguage'
import { useSimulatedProgress } from '../useSimulatedProgress'
import { GenerationProgressPanel } from './GenerationProgressPanel'

export type GenerationExecutionPageProps = {
  projectId: number
}

export function GenerationExecutionPage({ projectId }: GenerationExecutionPageProps) {
  const { turns, map } = useContextHistory(projectId)
  const language = findLatestValidTurn(turns)?.planner.language ?? null
  const progress = useSimulatedProgress(GENERATION_DURATION_MS)

  return (
    <div className="p-8">
      <PageHeader title={GENERATION_PAGE_TEXTS.title} subtitle={GENERATION_PAGE_TEXTS.subtitle} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <ArchitectureDiagram map={map} />
        <GenerationProgressPanel progress={progress} languageLabel={formatSolutionLanguage(language)} />
      </div>
    </div>
  )
}
