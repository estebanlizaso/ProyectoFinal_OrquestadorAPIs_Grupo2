import type { ModuleEndpoint } from '../types'

export function formatEndpoint({ method, route }: ModuleEndpoint): string {
  return `${method} ${route}`
}
