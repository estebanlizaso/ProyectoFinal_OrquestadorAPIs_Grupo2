import type { ModuleEndpoint } from '../types'
import { isHttpMethod } from './isHttpMethod'
import { validateRoute } from './validateRoute'

export function parseOperation(operation: string): ModuleEndpoint | null {
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
