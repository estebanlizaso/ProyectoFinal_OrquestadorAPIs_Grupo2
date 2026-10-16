import { useState } from 'react'
import { useCreateProjectContext } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { GLOBAL_CONTEXT_ERROR_MESSAGES, GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import { ContextConversation } from './ContextConversation'
import { ContextDetailsPanel } from './ContextDetailsPanel'
import { PromptComposer } from './PromptComposer'

export type GlobalContextPageProps = {
  projectId: number
}

export function GlobalContextPage({ projectId }: GlobalContextPageProps) {
  const [draft, setDraft] = useState('')
  const [sentPrompt, setSentPrompt] = useState<string | null>(null)
  const { context, run, status, error } = useCreateProjectContext()

  async function handleSubmit(): Promise<void> {
    const prompt = draft.trim()
    setSentPrompt(prompt)
    setDraft('')
    const createdContext = await run(projectId, prompt)
    if (!createdContext) {
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
            prompt={context?.initialPrompt ?? sentPrompt}
            generatedContent={context?.generatedContent ?? null}
            status={status}
            errorMessage={error ? getErrorMessage(error, GLOBAL_CONTEXT_ERROR_MESSAGES) : null}
          />
          <PromptComposer
            value={draft}
            onChange={setDraft}
            onSubmit={() => void handleSubmit()}
            isSending={status === 'loading'}
            isLocked={context !== null}
          />
        </Card>

        <ContextDetailsPanel generatedContent={context?.generatedContent ?? null} />
      </div>
    </div>
  )
}
