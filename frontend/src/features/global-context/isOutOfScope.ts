import type { PlannerContentResponse } from './types'

export function isOutOfScope(planner: PlannerContentResponse): boolean {
  return planner.status === 'out_of_scope'
}
