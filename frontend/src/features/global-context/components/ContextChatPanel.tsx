import { useCallback, useState, type ReactNode } from 'react'
import { AiModelSelector, useAiSelection } from '../../ai-selection'
import { ContextTimeoutConfigurationError, useCreateProjectContext } from '../../../services/projectContextService'
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
  header?: ReactNode
  onSendStart?: () => void
}

export function ContextChatPanel({
  projectId,
  turns,
  onTurnAdded,
  onErrorTurnAdded,
  onSendStart,
  header = <h2 className="text-lg leading-none font-bold text-gray-900">{CONTEXT_CHAT_TEXTS.title}</h2>,
}: ContextChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [typingTurnIndex, setTypingTurnIndex] = useState<number | null>(null)
  const { run, status } = useCreateProjectContext()
  const ai = useAiSelection(projectId)
  const handleTypingEnd = useCallback(() => setTypingTurnIndex(null), [])
  const isSending = status === 'loading' || typingTurnIndex !== null

  async function handleSubmit(): Promise<void> {
    if (!ai.selection || isSending) return
    const prompt = draft.trim()
    setPendingPrompt(prompt)
    setDraft('')
    onSendStart?.()
    const { context, error } = await run(projectId, prompt, ai.selection)
    setPendingPrompt(null)
    if (context?.planner) {
      setTypingTurnIndex(turns.length)
      onTurnAdded({ prompt, planner: context.planner }, { nodes: context.nodes, relations: context.relations })
      return
    }
    const errorMessage = error instanceof ContextTimeoutConfigurationError
      ? 'La configuración del tiempo de espera del chat no es válida. Revisá VITE_AI_CONTEXT_TIMEOUT_MS.'
      : getErrorMessage(error ?? new Error(), GLOBAL_CONTEXT_ERROR_MESSAGES)
    onErrorTurnAdded({ prompt, errorMessage })
    setDraft(prompt)
  }

  return (
    <Card className="flex max-h-[60vh] flex-col gap-6 p-6 lg:max-h-full">
      {header}
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
        disabled={!ai.selection || ai.status !== 'success'}
        extraAction={turns.length === 0 && <PromptExampleButton disabled={isSending} onUse={setDraft} />}
      />
      <AiModelSelector
        catalog={ai.catalog}
        status={ai.status}
        error={ai.error}
        retry={ai.retry}
        selection={ai.selection}
        onSelect={ai.select}
        selectionUnavailable={ai.selectionUnavailable}
        storageUnavailable={ai.storageUnavailable}
        disabled={isSending}
      />
    </Card>
  )
}
