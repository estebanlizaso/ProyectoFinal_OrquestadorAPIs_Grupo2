import type { OrchestrationRelationResponse } from '../../global-context'
import { isHttpMethod } from './isHttpMethod'
import type { ModuleEndpoint } from '../types'
import { validateRoute } from './validateRoute'

function parseOperation(operation: string): ModuleEndpoint | null {
  const [method, route, ...rest] = operation.trim().split(/\s+/)
  if (rest.length > 0 || method === undefined || route === undefined) {
    return null
  }
  const upperMethod = method.toUpperCase()
  if (!isHttpMethod(upperMethod) || validateRoute(route) !== null) {
    return null
  }
  return { method: upperMethod, route }
}

export function findModuleEndpoints(nodeKey: string, relations: OrchestrationRelationResponse[]): ModuleEndpoint[] {
  const parsedEndpoints = relations
    .filter((relation) => relation.to === nodeKey)
    .toSorted((first, second) => first.sortOrder - second.sortOrder)
    .flatMap((relation) => {
      const endpoint = relation.operation === null ? null : parseOperation(relation.operation)
      return endpoint ? [endpoint] : []
    })

  return parsedEndpoints.filter(
    (endpoint, index) =>
      parsedEndpoints.findIndex(
        (other) => other.method === endpoint.method && other.route === endpoint.route,
      ) === index,
  )
}
