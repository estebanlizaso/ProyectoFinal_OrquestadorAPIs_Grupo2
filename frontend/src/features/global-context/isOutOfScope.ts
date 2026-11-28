import type { PlannerContentResponse } from './types'

export function isOutOfScope(planner: Pick<PlannerContentResponse, 'status'>): boolean {
  return planner.status === 'out_of_scope'
}
