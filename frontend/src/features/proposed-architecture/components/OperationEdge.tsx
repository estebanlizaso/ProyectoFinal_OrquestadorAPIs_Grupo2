import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { OperationFlowEdge } from '../types'

export type OperationEdgeProps = EdgeProps<OperationFlowEdge>

export function OperationEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  data,
}: OperationEdgeProps) {
  const [path, , centerY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const label = data?.label ?? null
  const labelY = (centerY + targetY) / 2

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute max-w-56 truncate rounded bg-primary-blue-light px-2 py-1 text-diagram-edge text-primary-blue hover:z-10 hover:max-w-none hover:shadow-md"
            style={{ transform: `translate(-50%, -50%) translate(${targetX}px, ${labelY}px)` }}
            title={label}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
