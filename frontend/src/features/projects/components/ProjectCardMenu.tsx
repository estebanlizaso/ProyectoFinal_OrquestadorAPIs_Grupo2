import { EllipsisVertical, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PROJECT_CARD_TEXTS } from '../constants'

export type ProjectCardMenuProps = {
  onDelete: () => void
}

export function ProjectCardMenu({ onDelete }: ProjectCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target) === false) {
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

  function handleDelete(): void {
    setIsOpen(false)
    onDelete()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={PROJECT_CARD_TEXTS.actionsMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
      >
        <EllipsisVertical className="size-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-gray-100 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {PROJECT_CARD_TEXTS.deleteAction}
          </button>
        </div>
      )}
    </div>
  )
}