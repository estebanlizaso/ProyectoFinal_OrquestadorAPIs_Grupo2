import { isOutOfScope } from './isOutOfScope'
import type { ContextTurn } from './useContextHistory'

export function findLatestValidTurn(turns: ContextTurn[]): ContextTurn | null {
  return turns.findLast((turn) => !isOutOfScope(turn.planner)) ?? null
}
