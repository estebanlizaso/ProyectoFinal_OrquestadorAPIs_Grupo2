import { ArrowUp, LoaderCircle } from 'lucide-react'
import { useId, type KeyboardEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { PROMPT_COMPOSER_TEXTS } from '../constants'

export type PromptComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSending: boolean
  isLocked: boolean
}

export function PromptComposer({ value, onChange, onSubmit, isSending, isLocked }: PromptComposerProps) {
  const textareaId = useId()
  const isDisabled = isSending || isLocked
  const canSubmit = !isDisabled && value.trim() !== ''

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }
    event.preventDefault()
    if (canSubmit) {
      onSubmit()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) {
          onSubmit()
        }
      }}
    >
      <label htmlFor={textareaId} className="sr-only">
        {PROMPT_COMPOSER_TEXTS.label}
      </label>
      <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white py-2 pr-2 pl-4 focus-within:border-primary-blue has-disabled:bg-gray-50">
        <textarea
          id={textareaId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PROMPT_COMPOSER_TEXTS.placeholder}
          disabled={isDisabled}
          rows={1}
          className="field-sizing-content max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={PROMPT_COMPOSER_TEXTS.send}
          disabled={!canSubmit}
          className="shrink-0 rounded-full"
        >
          {isSending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {isLocked && <p className="mt-2 text-xs text-gray-500">{PROMPT_COMPOSER_TEXTS.sentNotice}</p>}
    </form>
  )
}
