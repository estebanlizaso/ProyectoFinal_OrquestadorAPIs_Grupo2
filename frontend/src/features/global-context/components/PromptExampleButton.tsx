import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { PROMPT_EXAMPLE_TEXTS } from '../constants'

export type PromptExampleButtonProps = {
  disabled: boolean
  onUse: (example: string) => void
}

export function PromptExampleButton({ disabled, onUse }: PromptExampleButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleUse(): void {
    onUse(PROMPT_EXAMPLE_TEXTS.example)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        variant="soft"
        size="sm"
        aria-label={PROMPT_EXAMPLE_TEXTS.buttonLabel}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className="h-8 rounded-full font-semibold"
      >
        {PROMPT_EXAMPLE_TEXTS.button}
      </Button>

      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={PROMPT_EXAMPLE_TEXTS.title}
          className="absolute top-full right-0 z-10 mt-3 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-gray-900">{PROMPT_EXAMPLE_TEXTS.title}</p>
            <Button size="sm" onClick={handleUse}>
              {PROMPT_EXAMPLE_TEXTS.use}
            </Button>
          </div>
          <p className="mt-2 text-sm text-gray-500">{PROMPT_EXAMPLE_TEXTS.example}</p>
        </div>
      )}
    </div>
  )
}
