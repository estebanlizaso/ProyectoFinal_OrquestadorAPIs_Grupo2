export type PromptBubbleProps = {
  prompt: string
}

export function PromptBubble({ prompt }: PromptBubbleProps) {
  return (
    <p className="ml-auto w-fit max-w-4/5 rounded-lg bg-primary-blue-light px-4 py-3 text-sm whitespace-pre-wrap text-gray-900">
      {prompt}
    </p>
  )
}
