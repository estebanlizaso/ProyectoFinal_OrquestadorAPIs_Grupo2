import { Loader2 } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'

export type DiagramUpdatingOverlayProps = {
  isVisible: boolean
}

export function DiagramUpdatingOverlay({ isVisible }: DiagramUpdatingOverlayProps) {
  return (
    <div
      role="status"
      aria-label={isVisible ? PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramUpdating : undefined}
      aria-hidden={!isVisible}
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary-blue" aria-hidden="true" />
    </div>
  )
}
