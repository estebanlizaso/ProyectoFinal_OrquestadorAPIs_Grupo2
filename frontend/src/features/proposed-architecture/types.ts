import type { Edge, Node } from '@xyflow/react'
import type { OrchestrationNodeResponse } from '../global-context'
import type { AUTHENTICATION_TYPES, HTTP_METHODS, ROUTE_ERROR_TEXTS } from './constants'

export type StartFlowNode = Node<Record<string, never>, 'start'>

export type DecisionFlowNode = Node<Record<string, never>, 'decision'>

export type ArchitectureNodeData = {
  node: OrchestrationNodeResponse
}

export type ArchitectureFlowNode = Node<ArchitectureNodeData, 'architecture'>

export type DiagramNode = StartFlowNode | DecisionFlowNode | ArchitectureFlowNode

export type OperationEdgeData = {
  label: string | null
}

export type OperationFlowEdge = Edge<OperationEdgeData, 'operation'>

export type Diagram = {
  nodes: DiagramNode[]
  edges: OperationFlowEdge[]
}

export type HttpMethod = (typeof HTTP_METHODS)[number]

export type AuthenticationType = (typeof AUTHENTICATION_TYPES)[number]

export type ModuleEndpoint = {
  method: HttpMethod | ''
  route: string
}

export type RouteError = keyof typeof ROUTE_ERROR_TEXTS

export type EndpointError = RouteError | 'incomplete'

export type ModuleConfig = {
  endpoints: ModuleEndpoint[]
  authentication: AuthenticationType | ''
}
