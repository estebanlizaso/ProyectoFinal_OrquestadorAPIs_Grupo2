import { CONTEXT_CHAT_TEXTS } from '../constants'
import type { ErrorTurn } from '../useContextHistory'
import { PromptBubble } from './PromptBubble'

export type ErrorConversationTurnProps = {
  turn: ErrorTurn
}

export function ErrorConversationTurn({ turn }: ErrorConversationTurnProps) {
  return (
    <div className="space-y-4">
      <PromptBubble prompt={turn.prompt} />

      <div role="alert" className="max-w-4/5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <p className="font-semibold">{CONTEXT_CHAT_TEXTS.errorTitle}</p>
        <p>{turn.errorMessage}</p>
      </div>
    </div>
  )
}
