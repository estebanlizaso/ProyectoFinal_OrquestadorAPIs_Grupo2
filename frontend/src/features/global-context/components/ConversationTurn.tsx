import { CircleAlert } from 'lucide-react'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import { isOutOfScope } from '../isOutOfScope'
import type { ContextTurn } from '../useContextHistory'
import { AiBubble } from './AiBubble'
import { PromptBubble } from './PromptBubble'

export type ConversationTurnProps = {
  turn: ContextTurn
}

export function ConversationTurn({ turn }: ConversationTurnProps) {
  const { prompt, planner } = turn

  return (
    <div className="space-y-4">
      <PromptBubble prompt={prompt} />

      <div className="flex max-w-4/5 flex-col items-start gap-2">
        {isOutOfScope(planner) ? (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">{GLOBAL_CONTEXT_PAGE_TEXTS.rejectedTitle}</p>
              <p>{planner.reply}</p>
            </div>
          </div>
        ) : (
          <>
            <AiBubble>{planner.reply}</AiBubble>

            {planner.questions.length > 0 && (
              <>
                <h3 className="mt-2 text-sm font-semibold text-gray-900">{GLOBAL_CONTEXT_PAGE_TEXTS.questionsTitle}</h3>
                <ol className="flex flex-col items-start gap-2">
                  {planner.questions.map((question, index) => (
                    <li key={question}>
                      <AiBubble>
                        {index + 1}. {question}
                      </AiBubble>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
