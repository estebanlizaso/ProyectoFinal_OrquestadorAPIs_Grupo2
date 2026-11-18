import { Skeleton } from '../../../shared/ui/Skeleton'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'

export function DiagramSkeleton() {
  return (
    <div role="status" aria-label={PROPOSED_ARCHITECTURE_PAGE_TEXTS.diagramLoading} className="flex flex-col items-center">
      <div className="size-14 overflow-hidden rounded-full">
        <Skeleton className="size-full" />
      </div>
      <Skeleton className="h-16 w-px" />
      <Skeleton className="h-18 w-60" />
      <Skeleton className="h-16 w-px" />
      <Skeleton className="h-18 w-60" />
    </div>
  )
}
