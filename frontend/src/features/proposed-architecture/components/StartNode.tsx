import { Handle, Position } from '@xyflow/react'
import { DIAGRAM_TEXTS } from '../constants'

export function StartNode() {
  return (
    <div className="flex size-full items-center justify-center rounded-full border border-gray-400 bg-white text-xs text-gray-600">
      {DIAGRAM_TEXTS.start}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
