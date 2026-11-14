import { FLOW_SUMMARY_TEXTS } from '../constants'

export type FlowSummaryContentProps = {
  flowSummary: string | null
  endpoints: string[]
}

export function FlowSummaryContent({ flowSummary, endpoints }: FlowSummaryContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-900">{FLOW_SUMMARY_TEXTS.flowSummaryTitle}</h3>
        <p className="mt-2 text-sm whitespace-pre-wrap text-gray-500">
          {flowSummary ?? FLOW_SUMMARY_TEXTS.flowSummaryEmpty}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">{FLOW_SUMMARY_TEXTS.proposedEndpointsTitle}</h3>
        {endpoints.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-500">
            {endpoints.map((endpoint) => (
              <li key={endpoint} className="break-all">
                {endpoint}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-400">{FLOW_SUMMARY_TEXTS.proposedEndpointsEmpty}</p>
        )}
      </section>
    </div>
  )
}
