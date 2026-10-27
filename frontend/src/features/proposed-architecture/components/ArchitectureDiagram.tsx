import { useMemo } from 'react'
import { Background, Controls, ReactFlow, type EdgeTypes, type NodeTypes } from '@xyflow/react'
import type { ContextMap, OrchestrationNodeResponse } from '../../global-context'
import { Card } from '../../../shared/ui/Card'
import { buildDiagram } from '../buildDiagram'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { DiagramNode, OperationFlowEdge } from '../types'
import { ArchitectureNode } from './ArchitectureNode'
import { DecisionNode } from './DecisionNode'
import { OperationEdge } from './OperationEdge'
import { StartNode } from './StartNode'

export type ArchitectureDiagramProps = {
  map: ContextMap
  onModuleOpen: (node: OrchestrationNodeResponse) => void
}

const NODE_TYPES: NodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  architecture: ArchitectureNode,
}

const EDGE_TYPES: EdgeTypes = {
  operation: OperationEdge,
}

export function ArchitectureDiagram({ map, onModuleOpen }: ArchitectureDiagramProps) {
  const diagram = useMemo(() => buildDiagram(map), [map])

  if (diagram.nodes.length === 0) {
    return (
      <Card className="flex min-h-[60vh] items-center justify-center p-6 lg:col-span-2">
        <p className="text-sm text-gray-400">{PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramEmpty}</p>
      </Card>
    )
  }

  return (
    <Card className="h-[60vh] overflow-hidden p-0 lg:col-span-2">
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
            onModuleOpen(diagramNode.data.node)
          }
        }}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Card>
  )
}
