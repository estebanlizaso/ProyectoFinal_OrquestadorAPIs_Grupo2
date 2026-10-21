import { useState } from 'react'
import { useCreateProjectContext } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import { GLOBAL_CONTEXT_ERROR_MESSAGES } from '../errorMessages'
import { isOutOfScope } from '../isOutOfScope'
import { useContextHistory } from '../useContextHistory'
import { ContextConversation } from './ContextConversation'
import { ContextDetailsPanel } from './ContextDetailsPanel'
import { PromptComposer } from './PromptComposer'

export type GlobalContextPageProps = {
  projectId: number
}

export function GlobalContextPage({ projectId }: GlobalContextPageProps) {
  const [draft, setDraft] = useState('')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const { turns, addTurn } = useContextHistory(projectId)
  const { run, status, error } = useCreateProjectContext()
  const latestPlan = turns.findLast((turn) => !isOutOfScope(turn.generatedContent))?.generatedContent.plan ?? []

  async function handleSubmit(): Promise<void> {
    const prompt = draft.trim()
    setPendingPrompt(prompt)
    setDraft('')
    const createdContext = await run(projectId, prompt)
    if (createdContext) {
      addTurn({ prompt, generatedContent: createdContext.generatedContent })
      setPendingPrompt(null)
    } else {
      setDraft(prompt)
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title={GLOBAL_CONTEXT_PAGE_TEXTS.title}
        subtitle={GLOBAL_CONTEXT_PAGE_TEXTS.subtitle}
        actions={<Button disabled>{GLOBAL_CONTEXT_PAGE_TEXTS.generateArchitecture}</Button>}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-6 p-6 lg:col-span-2">
          <h2 className="text-lg leading-none font-bold text-gray-900">{GLOBAL_CONTEXT_PAGE_TEXTS.goalTitle}</h2>
          <ContextConversation
            turns={turns}
            pendingPrompt={pendingPrompt}
            status={status}
            errorMessage={error ? getErrorMessage(error, GLOBAL_CONTEXT_ERROR_MESSAGES) : null}
          />
          <PromptComposer
            value={draft}
            onChange={setDraft}
            onSubmit={() => void handleSubmit()}
            isSending={status === 'loading'}
          />
        </Card>

        <ContextDetailsPanel plan={latestPlan} />
      </div>
    </div>
  )
}
