import { SidePanel } from '../../../shared/ui/SidePanel'
import { CONTEXT_DETAILS_TEXTS } from '../constants'

export type ContextDetailsPanelProps = {
  plan: string[]
}

export function ContextDetailsPanel({ plan }: ContextDetailsPanelProps) {
  return (
    <SidePanel title={CONTEXT_DETAILS_TEXTS.title}>
      {plan.length > 0 ? (
        <>
          <h3 className="text-sm font-semibold text-gray-900">{CONTEXT_DETAILS_TEXTS.planTitle}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-500">
            {plan.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-gray-400">{CONTEXT_DETAILS_TEXTS.empty}</p>
      )}
    </SidePanel>
  )
}
