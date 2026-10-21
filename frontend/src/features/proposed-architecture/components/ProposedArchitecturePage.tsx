import { findLatestValidTurn, useContextHistory } from '../../global-context'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import { AiAssistantPanel } from './AiAssistantPanel'
import { ArchitectureDiagram } from './ArchitectureDiagram'

export type ProposedArchitecturePageProps = {
  projectId: number
}

export function ProposedArchitecturePage({ projectId }: ProposedArchitecturePageProps) {
  const { turns } = useContextHistory(projectId)
  const flowSummary = findLatestValidTurn(turns)?.generatedContent.summary ?? null

  return (
    <div className="p-8">
      <PageHeader
        title={PROPOSED_ARCHITECTURE_PAGE_TEXTS.title}
        actions={<Button disabled>{PROPOSED_ARCHITECTURE_PAGE_TEXTS.confirmFlow}</Button>}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <ArchitectureDiagram />
        <AiAssistantPanel flowSummary={flowSummary} />
      </div>
    </div>
  )
}
