import { useCallback, useState } from 'react'
import { useCreateProjectContext } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Card } from '../../../shared/ui/Card'
import { CONTEXT_CHAT_TEXTS } from '../constants'
import { GLOBAL_CONTEXT_ERROR_MESSAGES } from '../errorMessages'
import type { ContextMap, ContextTurn, ErrorTurn, PlannerTurn } from '../useContextHistory'
import { ContextConversation } from './ContextConversation'
import { PromptComposer } from './PromptComposer'
import { PromptExampleButton } from './PromptExampleButton'

export type ContextChatPanelProps = {
  projectId: number
  turns: ContextTurn[]
  onTurnAdded: (turn: PlannerTurn, map: ContextMap) => void
  onErrorTurnAdded: (turn: ErrorTurn) => void
}

export function ContextChatPanel({ projectId, turns, onTurnAdded, onErrorTurnAdded }: ContextChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [typingTurnIndex, setTypingTurnIndex] = useState<number | null>(null)
  const { run, status } = useCreateProjectContext()
  const handleTypingEnd = useCallback(() => setTypingTurnIndex(null), [])
  const isSending = status === 'loading' || typingTurnIndex !== null

  async function handleSubmit(): Promise<void> {
    const prompt = draft.trim()
    setPendingPrompt(prompt)
    setDraft('')
    const { context, error } = await run(projectId, prompt)
    setPendingPrompt(null)
    if (context?.planner) {
      setTypingTurnIndex(turns.length)
      onTurnAdded({ prompt, planner: context.planner }, { nodes: context.nodes, relations: context.relations })
      return
    }
    onErrorTurnAdded({ prompt, errorMessage: getErrorMessage(error ?? new Error(), GLOBAL_CONTEXT_ERROR_MESSAGES) })
    setDraft(prompt)
  }

  return (
    <Card className="flex max-h-[60vh] flex-col gap-6 p-6 lg:max-h-full">
      <h2 className="text-lg leading-none font-bold text-gray-900">{CONTEXT_CHAT_TEXTS.title}</h2>
      <ContextConversation
        turns={turns}
        pendingPrompt={pendingPrompt}
        typingTurnIndex={typingTurnIndex}
        onTypingEnd={handleTypingEnd}
      />
      <PromptComposer
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        isSending={isSending}
        extraAction={turns.length === 0 && <PromptExampleButton disabled={isSending} onUse={setDraft} />}
      />
    </Card>
  )
}
