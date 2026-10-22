import type { OrchestrationNodeResponse } from '../types'

export type NodeCardProps = {
  node: OrchestrationNodeResponse
}

export function NodeCard({ node }: NodeCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900">{node.name}</p>
      {node.description && <p className="mt-1 text-xs text-gray-500">{node.description}</p>}
    </div>
  )
}
