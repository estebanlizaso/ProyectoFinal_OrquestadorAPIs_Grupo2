import { Button } from '../../../shared/ui/Button'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'

export type DiagramLoadErrorProps = {
  onRetry: () => void
}

export function DiagramLoadError({ onRetry }: DiagramLoadErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-sm text-red-700">
      <p className="font-semibold">{PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramError}</p>
      <Button variant="secondary" onClick={onRetry}>
        {PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramRetry}
      </Button>
    </div>
  )
}
