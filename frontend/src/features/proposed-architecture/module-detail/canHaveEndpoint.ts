import type { OrchestrationNodeResponse } from '../../global-context'

const KINDS_WITHOUT_ENDPOINT = ['actor', 'step']

export function canHaveEndpoint(node: OrchestrationNodeResponse): boolean {
  return !KINDS_WITHOUT_ENDPOINT.includes(node.kind)
}
