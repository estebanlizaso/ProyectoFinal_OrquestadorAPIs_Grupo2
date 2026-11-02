import { CircleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CONTEXT_CHAT_TEXTS } from '../constants'
import { isOutOfScope } from '../isOutOfScope'
import type { ContextTurn } from '../useContextHistory'
import { useTypewriter } from '../useTypewriter'
import { AiBubble } from './AiBubble'
import { PromptBubble } from './PromptBubble'

export type ConversationTurnProps = {
  turn: ContextTurn
  isTyping: boolean
  onTypingEnd: () => void
}

export function ConversationTurn({ turn, isTyping, onTypingEnd }: ConversationTurnProps) {
  const { prompt, planner } = turn
  const typewriter = useTypewriter(planner.reply, isTyping)
  const replyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTyping) {
      return
    }
    if (typewriter.isTyping) {
      replyRef.current?.scrollIntoView({ block: 'end' })
      return
    }
    onTypingEnd()
  }, [isTyping, typewriter.isTyping, typewriter.visibleText, onTypingEnd])

  return (
    <div className="space-y-4">
      <PromptBubble prompt={prompt} />

      <div ref={replyRef} className="flex max-w-4/5 flex-col items-start gap-2">
        {isOutOfScope(planner) ? (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{CONTEXT_CHAT_TEXTS.rejectedTitle}</p>
              <p>{typewriter.visibleText}</p>
            </div>
          </div>
        ) : (
          <AiBubble>{typewriter.visibleText}</AiBubble>
        )}
      </div>
    </div>
  )
}
