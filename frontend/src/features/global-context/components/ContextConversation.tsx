import { useEffect, useRef } from 'react'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import type { ContextTurn } from '../useContextHistory'
import { ConversationTurn } from './ConversationTurn'
import { PromptBubble } from './PromptBubble'

export type ContextConversationProps = {
  turns: ContextTurn[]
  pendingPrompt: string | null
  errorMessage: string | null
}

export function ContextConversation({ turns, pendingPrompt, errorMessage }: ContextConversationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [turns, pendingPrompt, errorMessage])

  if (turns.length === 0 && pendingPrompt === null) {
    return <p className="text-sm text-gray-400">{GLOBAL_CONTEXT_PAGE_TEXTS.goalEmpty}</p>
  }

  return (
    <div ref={scrollContainerRef} className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
      {turns.map((turn, index) => (
        <ConversationTurn key={index} turn={turn} />
      ))}

      {pendingPrompt !== null && <PromptBubble prompt={pendingPrompt} />}

      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{GLOBAL_CONTEXT_PAGE_TEXTS.errorTitle}</p>
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
