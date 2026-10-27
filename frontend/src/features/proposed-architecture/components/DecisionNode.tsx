import { Handle, Position } from '@xyflow/react'
import { DIAGRAM_TEXTS } from '../constants'

export function DecisionNode() {
  return (
    <div className="relative flex size-full items-center justify-center">
      <div className="absolute inset-2 rotate-45 border border-gray-400 bg-white" />
      <span className="relative text-[10px] text-gray-600">{DIAGRAM_TEXTS.decision}</span>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
