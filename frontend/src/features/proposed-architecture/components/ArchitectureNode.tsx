import type { ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ListChecks, Server, User, Workflow } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { getModuleRule } from '../module-detail/getModuleRule'
import type { ArchitectureFlowNode } from '../types'

export type ArchitectureNodeProps = NodeProps<ArchitectureFlowNode>

function renderKindIcon(kind: string): ReactNode {
  switch (kind) {
    case 'actor':
      return <User className="size-4" />
    case 'orchestrator':
      return <Workflow className="size-4" />
    case 'step':
      return <ListChecks className="size-4" />
    default:
      return <Server className="size-4" />
  }
}

export function ArchitectureNode({ data }: ArchitectureNodeProps) {
  const { node } = data
  const rule = getModuleRule(node)

  return (
    <div
      className={cn(
        'flex size-full cursor-pointer items-center gap-3 rounded-xl border px-4 transition hover:border-primary-blue hover:shadow-md',
        node.kind === 'step' ? 'border-primary-blue/30 bg-primary-blue-light' : 'border-gray-200 bg-white',
      )}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-blue-light text-primary-blue">
        {renderKindIcon(node.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900" title={node.name}>
          {node.name}
        </p>
        {rule && (
          <p className="truncate text-xs text-gray-500" title={rule}>
            {rule}
          </p>
        )}
      </div>
      {node.isActive && <span className="size-2 shrink-0 self-start mt-3 rounded-full bg-green-500" />}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
