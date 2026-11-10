import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

export type ModalSize = 'md' | 'lg'

export type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  isDismissible?: boolean
  size?: ModalSize
  closeLabel?: string
  children: ReactNode
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
}

export function Modal({
  title,
  description,
  onClose,
  isDismissible = true,
  size = 'md',
  closeLabel,
  children,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isDismissible) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDismissible, onClose])

  const titleElement = (
    <h2 id={titleId} className="text-lg font-bold text-gray-900">
      {title}
    </h2>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
      onClick={(event) => {
        if (isDismissible && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn('w-full', SIZE_CLASSES[size], 'rounded-xl bg-white p-6 shadow-lg')}
      >
        {closeLabel ? (
          <div className="flex items-start justify-between gap-4">
            {titleElement}
            <button
              type="button"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClose}
              disabled={!isDismissible}
              aria-label={closeLabel}
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          titleElement
        )}
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-gray-500">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
