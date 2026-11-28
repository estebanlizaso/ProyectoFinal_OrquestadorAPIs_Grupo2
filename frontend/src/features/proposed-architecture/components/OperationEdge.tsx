import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { OperationFlowEdge } from '../types'

export type OperationEdgeProps = EdgeProps<OperationFlowEdge>

type EdgeGeometry = {
  path: string
  labelX: number
  labelY: number
}

const CURVE_CONTROL_FRACTION = 1 / 3
const CURVE_MIDPOINT_FACTOR = 0.75

type EdgeEnds = Pick<OperationEdgeProps, 'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'>

function buildCurvedGeometry({ sourceX, sourceY, targetX, targetY }: EdgeEnds, curveOffset: number): EdgeGeometry {
  const verticalStep = (targetY - sourceY) * CURVE_CONTROL_FRACTION
  const path = `M ${sourceX},${sourceY} C ${sourceX + curveOffset},${sourceY + verticalStep} ${targetX + curveOffset},${targetY - verticalStep} ${targetX},${targetY}`
  return { path, labelX: (sourceX + targetX) / 2 + curveOffset * CURVE_MIDPOINT_FACTOR, labelY: (sourceY + targetY) / 2 }
}

function buildStepGeometry(ends: EdgeEnds): EdgeGeometry {
  const [path, , centerY] = getSmoothStepPath(ends)
  return { path, labelX: ends.targetX, labelY: (centerY + ends.targetY) / 2 }
}

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
  const ends = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }
  const curveOffset = data?.curveOffset ?? 0
  const { path, labelX, labelY } = curveOffset === 0 ? buildStepGeometry(ends) : buildCurvedGeometry(ends, curveOffset)
  const label = data?.label ?? null

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute max-w-56 truncate rounded bg-primary-blue-light px-2 py-1 text-diagram-edge text-primary-blue hover:z-10 hover:max-w-none hover:shadow-md"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            title={label}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
