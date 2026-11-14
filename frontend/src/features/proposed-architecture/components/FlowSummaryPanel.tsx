import { SidePanel } from '../../../shared/ui/SidePanel'
import { FLOW_SUMMARY_TEXTS } from '../constants'
import { FlowSummaryContent } from './FlowSummaryContent'

export type FlowSummaryPanelProps = {
  flowSummary: string | null
  endpoints: string[]
}

export function FlowSummaryPanel({ flowSummary, endpoints }: FlowSummaryPanelProps) {
  return (
    <SidePanel title={FLOW_SUMMARY_TEXTS.title}>
      <FlowSummaryContent flowSummary={flowSummary} endpoints={endpoints} />
    </SidePanel>
  )
}
