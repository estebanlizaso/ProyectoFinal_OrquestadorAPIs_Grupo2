import { SidePanel } from '../../../shared/ui/SidePanel'
import { CONTEXT_DETAILS_TEXTS } from '../constants'
import type { OrchestrationNodeResponse } from '../types'
import { NodeCard } from './NodeCard'

export type ContextDetailsPanelProps = {
  nodes: OrchestrationNodeResponse[]
  assumptions: string[]
}

export function ContextDetailsPanel({ nodes, assumptions }: ContextDetailsPanelProps) {
  return (
    <SidePanel title={CONTEXT_DETAILS_TEXTS.title}>
      {nodes.length > 0 ? (
        <ul className="space-y-3">
          {nodes.map((node) => (
            <li key={node.key}>
              <NodeCard node={node} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">{CONTEXT_DETAILS_TEXTS.empty}</p>
      )}

      {assumptions.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-gray-900">{CONTEXT_DETAILS_TEXTS.assumptionsTitle}</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-500">
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </>
      )}
    </SidePanel>
  )
}
