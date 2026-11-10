import type { EndpointError, ModuleEndpoint } from '../types'
import { validateRoute } from './validateRoute'

export function validateEndpoint({ method, route }: ModuleEndpoint): EndpointError | null {
  if (method === '' && route === '') {
    return null
  }
  if (method === '' || route === '') {
    return 'incomplete'
  }
  return validateRoute(route)
}
