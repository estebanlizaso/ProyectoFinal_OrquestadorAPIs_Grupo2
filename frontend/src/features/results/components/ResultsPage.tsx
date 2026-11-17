import { useContextHistory } from '../../global-context'
import { ArchitectureDiagram } from '../../proposed-architecture'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { RESULTS_PAGE_TEXTS } from '../constants'
import { ResultsActions } from './ResultsActions'

export type ResultsPageProps = {
  projectId: number
  onBackToProjects: () => void
}

export function ResultsPage({ projectId, onBackToProjects }: ResultsPageProps) {
  const { map } = useContextHistory(projectId)

  return (
    <div className="flex animate-fade-in flex-col p-8 lg:h-full">
      <PageHeader
        title={RESULTS_PAGE_TEXTS.title}
        subtitle={RESULTS_PAGE_TEXTS.subtitle}
        actions={<ResultsActions projectId={projectId} onBackToProjects={onBackToProjects} />}
      />
      <ArchitectureDiagram map={map} />
    </div>
  )
}
