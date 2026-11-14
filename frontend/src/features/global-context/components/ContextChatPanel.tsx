import { useCallback, useState, type ReactNode } from 'react'
import { AiModelSelector, useAiSelection } from '../../ai-selection'
import { ContextTimeoutConfigurationError, useCreateProjectContext } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { Card } from '../../../shared/ui/Card'
import { CONTEXT_CHAT_TEXTS } from '../constants'
import { GLOBAL_CONTEXT_ERROR_MESSAGES } from '../errorMessages'
import type { ContextMap, ContextTurn, ErrorTurn, PlannerTurn } from '../useContextHistory'
import { ContextConversation } from './ContextConversation'
import { HistoryLoadStatus } from './HistoryLoadStatus'
import { PromptComposer } from './PromptComposer'
import { PromptExampleButton } from './PromptExampleButton'

export type ContextChatPanelProps = {
  projectId: number
  turns: ContextTurn[]
  historyStatus: RequestStatus
  onHistoryRetry: () => void
  onTurnAdded: (turn: PlannerTurn, map: ContextMap) => void
  onErrorTurnAdded: (turn: ErrorTurn) => void
  header?: ReactNode
  onSendStart?: () => void
}

export function ContextChatPanel({
  projectId,
  turns,
  historyStatus,
  onHistoryRetry,
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
  const isHistoryReady = historyStatus === 'success'
  const canSend = isHistoryReady && ai.status === 'success' && ai.selection !== null && !isSending

  async function handleSubmit(): Promise<void> {
    if (!canSend || !ai.selection) return
    const prompt = draft.trim()
    setPendingPrompt(prompt)
    setDraft('')
    onSendStart?.()
    const { context, error } = await run(projectId, prompt, ai.selection)
    setPendingPrompt(null)
    const createdAt = new Date().toISOString()
    if (context?.planner) {
      setTypingTurnIndex(turns.length)
      onTurnAdded(
        { prompt, planner: context.planner, createdAt },
        { nodes: context.nodes, relations: context.relations },
      )
      return
    }
    const errorMessage =
      error instanceof ContextTimeoutConfigurationError
        ? 'La configuración del tiempo de espera del chat no es válida. Revisá VITE_AI_CONTEXT_TIMEOUT_MS.'
        : getErrorMessage(error ?? new Error(), GLOBAL_CONTEXT_ERROR_MESSAGES)
    onErrorTurnAdded({ prompt, errorMessage, createdAt })
    setDraft(prompt)
  }

  return (
    <Card className="flex max-h-[60vh] flex-col gap-6 p-6 lg:max-h-full">
      {header}
      {isHistoryReady ? (
        <ContextConversation
          turns={turns}
          pendingPrompt={pendingPrompt}
          typingTurnIndex={typingTurnIndex}
          onTypingEnd={handleTypingEnd}
        />
      ) : (
        <HistoryLoadStatus status={historyStatus} onRetry={onHistoryRetry} />
      )}
      <PromptComposer
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        isSending={isSending}
        disabled={!canSend}
        extraAction={
          isHistoryReady && turns.length === 0 && <PromptExampleButton disabled={isSending} onUse={setDraft} />
        }
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
