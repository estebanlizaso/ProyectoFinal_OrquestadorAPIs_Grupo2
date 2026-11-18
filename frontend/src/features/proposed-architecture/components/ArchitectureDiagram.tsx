import { useMemo } from 'react'
import { Background, Controls, ReactFlow, type EdgeTypes, type NodeTypes } from '@xyflow/react'
import type { ContextMap, OrchestrationNodeResponse } from '../../global-context'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { Card } from '../../../shared/ui/Card'
import { buildDiagram } from '../buildDiagram'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { DiagramNode, OperationFlowEdge } from '../types'
import { ArchitectureNode } from './ArchitectureNode'
import { DecisionNode } from './DecisionNode'
import { DiagramLoadError } from './DiagramLoadError'
import { DiagramSkeleton } from './DiagramSkeleton'
import { OperationEdge } from './OperationEdge'
import { DiagramUpdatingOverlay } from './DiagramUpdatingOverlay'
import { StartNode } from './StartNode'

export type ArchitectureDiagramProps = {
  map: ContextMap
  status: RequestStatus
  onRetry: () => void
  onModuleOpen?: (node: OrchestrationNodeResponse) => void
  isUpdating?: boolean
}

const NODE_TYPES: NodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  architecture: ArchitectureNode,
}

const EDGE_TYPES: EdgeTypes = {
  operation: OperationEdge,
}

export function ArchitectureDiagram({
  map,
  status,
  onRetry,
  onModuleOpen,
  isUpdating = false,
}: ArchitectureDiagramProps) {
  const areModulesClickable = onModuleOpen !== undefined
  const diagram = useMemo(() => buildDiagram(map, areModulesClickable), [map, areModulesClickable])

  if (status === 'loading' || status === 'error' || diagram.nodes.length === 0) {
    return (
      <Card className="relative flex h-[60vh] items-center justify-center p-6 lg:h-auto lg:min-h-0 lg:flex-1">
        {status === 'loading' && <DiagramSkeleton />}
        {status === 'error' && <DiagramLoadError onRetry={onRetry} />}
        {status !== 'loading' && status !== 'error' && (
          <p className="text-sm text-gray-400">{PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramEmpty}</p>
        )}
        <DiagramUpdatingOverlay isVisible={isUpdating} />
      </Card>
    )
  }

  return (
    <Card className="relative h-[60vh] overflow-hidden p-0 lg:h-auto lg:min-h-0 lg:flex-1">
      <ReactFlow<DiagramNode, OperationFlowEdge>
        nodes={diagram.nodes}
        edges={diagram.edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeClick={(_event, diagramNode) => {
          if (diagramNode.type === 'architecture') {
            onModuleOpen?.(diagramNode.data.node)
          }
        }}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
      <DiagramUpdatingOverlay isVisible={isUpdating} />
    </Card>
  )
}
