import { useEffect, useId, type ReactNode } from 'react'

export type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  isDismissible?: boolean
  children: ReactNode
}

export function Modal({ title, description, onClose, isDismissible = true, children }: ModalProps) {
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
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-bold text-gray-900">
          {title}
        </h2>
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