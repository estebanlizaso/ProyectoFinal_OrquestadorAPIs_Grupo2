import type { ContextMap } from '../global-context'
import { findRelationOperation } from './module-detail/findRelationOperation'

export function findProposedEndpoints({ nodes, relations }: ContextMap): string[] {
  const nodesByKey = new Map(nodes.map((node) => [node.key, node]))
  const operations = relations
    .toSorted((first, second) => first.sortOrder - second.sortOrder)
    .flatMap((relation) => {
      const operation = findRelationOperation(relation, nodesByKey)
      return operation ? [operation] : []
    })
  return [...new Set(operations)]
}
