import { CircleAlert } from 'lucide-react'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { GLOBAL_CONTEXT_PAGE_TEXTS } from '../constants'
import type { GeneratedCodeResponse } from '../types'

export type ContextConversationProps = {
  prompt: string | null
  generatedContent: GeneratedCodeResponse | null
  rejectionReason: string | null
  status: RequestStatus
  errorMessage: string | null
}

export function ContextConversation({
  prompt,
  generatedContent,
  rejectionReason,
  status,
  errorMessage,
}: ContextConversationProps) {
  if (prompt === null) {
    return <p className="text-sm text-gray-400">{GLOBAL_CONTEXT_PAGE_TEXTS.goalEmpty}</p>
  }

  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-primary-blue-light p-4 text-sm whitespace-pre-wrap text-gray-900">{prompt}</p>

      {status === 'loading' && (
        <p role="status" className="text-sm text-gray-500">
          {GLOBAL_CONTEXT_PAGE_TEXTS.generating}
        </p>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{GLOBAL_CONTEXT_PAGE_TEXTS.errorTitle}</p>
          <p>{errorMessage}</p>
        </div>
      )}

      {rejectionReason && (
        <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{GLOBAL_CONTEXT_PAGE_TEXTS.rejectedTitle}</p>
            <p>{rejectionReason}</p>
          </div>
        </div>
      )}

      {generatedContent && generatedContent.questions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">{GLOBAL_CONTEXT_PAGE_TEXTS.questionsTitle}</h3>
          <ol className="space-y-3">
            {generatedContent.questions.map((question, index) => (
              <li
                key={question}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900"
              >
                {index + 1}. {question}
              </li>
            ))}
          </ol>
        </div>
      )}

      {generatedContent?.code && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            {GLOBAL_CONTEXT_PAGE_TEXTS.codeTitle(generatedContent.language)}
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
            <code>{generatedContent.code}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
