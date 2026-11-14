import { useEffect, useRef } from 'react'
import { CONTEXT_CHAT_TEXTS } from '../constants'
import type { ContextTurn } from '../useContextHistory'
import { ConversationTurn } from './ConversationTurn'
import { ErrorConversationTurn } from './ErrorConversationTurn'
import { PromptBubble } from './PromptBubble'

export type ContextConversationProps = {
  turns: ContextTurn[]
  pendingPrompt: string | null
  typingTurnIndex: number | null
  onTypingEnd: () => void
}

export function ContextConversation({ turns, pendingPrompt, typingTurnIndex, onTypingEnd }: ContextConversationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [turns, pendingPrompt])

  if (turns.length === 0 && pendingPrompt === null) {
    return <p className="text-sm text-gray-400">{CONTEXT_CHAT_TEXTS.goalEmpty}</p>
  }

  return (
    <div ref={scrollContainerRef} className="min-h-0 space-y-6 overflow-y-auto pr-2">
      {turns.map((turn, index) =>
        'planner' in turn ? (
          <ConversationTurn key={index} turn={turn} isTyping={index === typingTurnIndex} onTypingEnd={onTypingEnd} />
        ) : (
          <ErrorConversationTurn key={index} turn={turn} />
        ),
      )}

      {pendingPrompt !== null && <PromptBubble prompt={pendingPrompt} />}
    </div>
  )
}
