import type { Edge, Node } from '@xyflow/react'
import type { OrchestrationNodeResponse } from '../global-context'

export type StartFlowNode = Node<Record<string, never>, 'start'>

export type DecisionFlowNode = Node<Record<string, never>, 'decision'>

export type ArchitectureNodeData = {
  node: OrchestrationNodeResponse
}

export type ArchitectureFlowNode = Node<ArchitectureNodeData, 'architecture'>

export type DiagramNode = StartFlowNode | DecisionFlowNode | ArchitectureFlowNode

export type Diagram = {
  nodes: DiagramNode[]
  edges: Edge[]
}
