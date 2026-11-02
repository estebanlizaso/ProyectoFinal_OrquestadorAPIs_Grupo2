import { useState } from 'react'
import { useCreateProjectContext } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Card } from '../../../shared/ui/Card'
import { CONTEXT_CHAT_TEXTS } from '../constants'
import { GLOBAL_CONTEXT_ERROR_MESSAGES } from '../errorMessages'
import type { ContextMap, ContextTurn } from '../useContextHistory'
import { ContextConversation } from './ContextConversation'
import { PromptComposer } from './PromptComposer'

export type ContextChatPanelProps = {
  projectId: number
  turns: ContextTurn[]
  onTurnAdded: (turn: ContextTurn, map: ContextMap) => void
}

export function ContextChatPanel({ projectId, turns, onTurnAdded }: ContextChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const { run, status, error } = useCreateProjectContext()

  async function handleSubmit(): Promise<void> {
    const prompt = draft.trim()
    setPendingPrompt(prompt)
    setDraft('')
    const createdContext = await run(projectId, prompt)
    if (createdContext?.planner) {
      onTurnAdded(
        { prompt, planner: createdContext.planner },
        { nodes: createdContext.nodes, relations: createdContext.relations },
      )
      setPendingPrompt(null)
    } else {
      setDraft(prompt)
    }
  }

  return (
    <Card className="flex max-h-[60vh] flex-col gap-6 p-6 lg:max-h-full">
      <h2 className="text-lg leading-none font-bold text-gray-900">{CONTEXT_CHAT_TEXTS.title}</h2>
      <ContextConversation
        turns={turns}
        pendingPrompt={pendingPrompt}
        errorMessage={error ? getErrorMessage(error, GLOBAL_CONTEXT_ERROR_MESSAGES) : null}
      />
      <PromptComposer
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        isSending={status === 'loading'}
      />
    </Card>
  )
}
