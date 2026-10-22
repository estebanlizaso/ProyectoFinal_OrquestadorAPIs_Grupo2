import { SidePanel } from '../../../shared/ui/SidePanel'
import { AI_ASSISTANT_TEXTS } from '../constants'

export type AiAssistantPanelProps = {
  flowSummary: string | null
}

export function AiAssistantPanel({ flowSummary }: AiAssistantPanelProps) {
  return (
    <SidePanel title={AI_ASSISTANT_TEXTS.title}>
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-900">{AI_ASSISTANT_TEXTS.flowSummaryTitle}</h3>
          <p className="mt-2 text-sm whitespace-pre-wrap text-gray-500">
            {flowSummary ?? AI_ASSISTANT_TEXTS.flowSummaryEmpty}
          </p>
        </section>

        <section className="rounded-lg bg-primary-blue-light p-4">
          <h3 className="text-sm font-semibold text-primary-blue">{AI_ASSISTANT_TEXTS.temporalRuleTitle}</h3>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">{AI_ASSISTANT_TEXTS.proposedEndpointsTitle}</h3>
        </section>
      </div>
    </SidePanel>
  )
}
