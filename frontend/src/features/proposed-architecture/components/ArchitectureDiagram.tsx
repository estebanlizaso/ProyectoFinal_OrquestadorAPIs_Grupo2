import { useMemo } from 'react'
import { Background, Controls, ReactFlow, type Edge, type NodeTypes } from '@xyflow/react'
import type { ContextMap } from '../../global-context'
import { Card } from '../../../shared/ui/Card'
import { buildDiagram } from '../buildDiagram'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { DiagramNode } from '../types'
import { ArchitectureNode } from './ArchitectureNode'
import { DecisionNode } from './DecisionNode'
import { StartNode } from './StartNode'

export type ArchitectureDiagramProps = {
  map: ContextMap
}

const NODE_TYPES: NodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  architecture: ArchitectureNode,
}

export function ArchitectureDiagram({ map }: ArchitectureDiagramProps) {
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
      <ReactFlow<DiagramNode, Edge>
        nodes={diagram.nodes}
        edges={diagram.edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Card>
  )
}
