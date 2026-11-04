import { isOutOfScope } from './isOutOfScope'
import type { ContextTurn, PlannerTurn } from './useContextHistory'

export function findLatestValidTurn(turns: ContextTurn[]): PlannerTurn | null {
  return turns.findLast((turn): turn is PlannerTurn => 'planner' in turn && !isOutOfScope(turn.planner)) ?? null
}
