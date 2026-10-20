import { Card } from '../../../shared/ui/Card'
import { CONTEXT_DETAILS_TEXTS } from '../constants'
import type { GeneratedCodeResponse } from '../types'

export type ContextDetailsPanelProps = {
  generatedContent: GeneratedCodeResponse | null
  isRejected: boolean
}

export function ContextDetailsPanel({ generatedContent, isRejected }: ContextDetailsPanelProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg leading-none font-bold text-gray-900">{CONTEXT_DETAILS_TEXTS.title}</h2>
      {generatedContent ? (
        <>
          <p className="mt-4 text-sm text-gray-700">{generatedContent.summary}</p>
          {generatedContent.plan.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-gray-900">{CONTEXT_DETAILS_TEXTS.planTitle}</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-500">
                {generatedContent.plan.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-400">
          {isRejected ? CONTEXT_DETAILS_TEXTS.rejected : CONTEXT_DETAILS_TEXTS.empty}
        </p>
      )}
    </Card>
  )
}
