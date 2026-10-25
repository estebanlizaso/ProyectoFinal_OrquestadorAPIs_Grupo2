import { MarkerType, type XYPosition } from '@xyflow/react'
import type { ContextMap, OrchestrationNodeResponse, OrchestrationRelationResponse } from '../global-context'
import type { Diagram, DiagramNode, OperationFlowEdge } from './types'

type DiagramNodeType = DiagramNode['type']

type TreeItem =
  | { id: string; type: 'start'; children: TreeItem[] }
  | { id: string; type: 'architecture'; node: OrchestrationNodeResponse; children: TreeItem[] }

const DIAGRAM_NODE_SIZES: Record<DiagramNodeType, { width: number; height: number }> = {
  start: { width: 56, height: 56 },
  architecture: { width: 240, height: 72 },
}

const HORIZONTAL_GAP = 32
const VERTICAL_GAP = 88
const START_ID = 'diagram-start'
const EMPTY_DIAGRAM: Diagram = { nodes: [], edges: [] }

function bySortOrder(first: { sortOrder: number }, second: { sortOrder: number }): number {
  return first.sortOrder - second.sortOrder
}

function toNodeId(key: string): string {
  return `node-${key}`
}

function groupBySource(relations: OrchestrationRelationResponse[]): Map<string, OrchestrationRelationResponse[]> {
  const relationsBySource = new Map<string, OrchestrationRelationResponse[]>()
  for (const relation of relations) {
    relationsBySource.set(relation.from, [...(relationsBySource.get(relation.from) ?? []), relation])
  }
  return relationsBySource
}

function buildTree(
  nodes: OrchestrationNodeResponse[],
  relationsBySource: Map<string, OrchestrationRelationResponse[]>,
): TreeItem {
  const nodesByKey = new Map(nodes.map((node) => [node.key, node]))
  const targetKeys = new Set([...relationsBySource.values()].flat().map((relation) => relation.to))
  const visitedKeys = new Set<string>()

  function visit(node: OrchestrationNodeResponse): TreeItem {
    visitedKeys.add(node.key)
    const outgoingRelations = relationsBySource.get(node.key) ?? []
    const children: TreeItem[] = []

    for (const relation of outgoingRelations) {
      const target = nodesByKey.get(relation.to)
      if (target && !visitedKeys.has(target.key)) {
        children.push(visit(target))
      }
    }

    return { id: toNodeId(node.key), type: 'architecture', node, children }
  }

  const rootCandidates = [...nodes.filter((node) => !targetKeys.has(node.key)), ...nodes]
  const roots: TreeItem[] = []

  for (const node of rootCandidates) {
    if (!visitedKeys.has(node.key)) {
      roots.push(visit(node))
    }
  }

  return { id: START_ID, type: 'start', children: roots }
}

function buildEdge(id: string, source: string, target: string, label: string | null): OperationFlowEdge {
  return {
    id,
    source,
    target,
    type: 'operation',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { label },
  }
}

function buildEdges(
  tree: TreeItem,
  relationsBySource: Map<string, OrchestrationRelationResponse[]>,
): OperationFlowEdge[] {
  const startEdges = tree.children.map((root) => buildEdge(`${START_ID}-${root.id}`, START_ID, root.id, null))
  const relationEdges = [...relationsBySource.entries()].flatMap(([sourceKey, relations]) =>
    relations.map((relation) => ({
      ...buildEdge(`relation-${relation.id}`, toNodeId(sourceKey), toNodeId(relation.to), relation.operation ?? relation.label),
      animated: relation.kind === 'async',
    })),
  )

  return [...startEdges, ...relationEdges]
}

function measureSubtree(item: TreeItem): number {
  return Math.max(DIAGRAM_NODE_SIZES[item.type].width, measureChildren(item.children))
}

function measureChildren(children: TreeItem[]): number {
  if (children.length === 0) {
    return 0
  }
  const childrenWidth = children.reduce((total, child) => total + measureSubtree(child), 0)
  return childrenWidth + HORIZONTAL_GAP * (children.length - 1)
}

function toDiagramNode(item: TreeItem, position: XYPosition): DiagramNode {
  const size = DIAGRAM_NODE_SIZES[item.type]
  if (item.type === 'architecture') {
    return { id: item.id, type: 'architecture', position, ...size, data: { node: item.node } }
  }
  return { id: item.id, type: item.type, position, ...size, data: {} }
}

function placeSubtree(item: TreeItem, left: number, top: number): DiagramNode[] {
  const size = DIAGRAM_NODE_SIZES[item.type]
  const subtreeWidth = measureSubtree(item)
  const placedNode = toDiagramNode(item, { x: left + (subtreeWidth - size.width) / 2, y: top })
  const childrenTop = top + size.height + VERTICAL_GAP
  let childLeft = left + (subtreeWidth - measureChildren(item.children)) / 2
  const placedChildren: DiagramNode[] = []

  for (const child of item.children) {
    placedChildren.push(...placeSubtree(child, childLeft, childrenTop))
    childLeft += measureSubtree(child) + HORIZONTAL_GAP
  }

  return [placedNode, ...placedChildren]
}

export function buildDiagram({ nodes, relations }: ContextMap): Diagram {
  if (nodes.length === 0) {
    return EMPTY_DIAGRAM
  }

  const sortedNodes = nodes.toSorted(bySortOrder)
  const nodeKeys = new Set(sortedNodes.map((node) => node.key))
  const validRelations = relations
    .filter((relation) => relation.from !== relation.to && nodeKeys.has(relation.from) && nodeKeys.has(relation.to))
    .toSorted(bySortOrder)
  const relationsBySource = groupBySource(validRelations)
  const tree = buildTree(sortedNodes, relationsBySource)

  return { nodes: placeSubtree(tree, 0, 0), edges: buildEdges(tree, relationsBySource) }
}
