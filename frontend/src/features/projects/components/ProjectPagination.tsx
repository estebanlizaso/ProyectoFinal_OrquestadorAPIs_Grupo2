import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { PROJECT_PAGINATION_TEXTS } from '../constants'

export type ProjectPaginationProps = {
  page: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPrevious: () => void
  onNext: () => void
}

export function ProjectPagination({
  page,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: ProjectPaginationProps) {
  if (!hasPreviousPage && !hasNextPage) {
    return null
  }

  return (
    <nav
      aria-label={PROJECT_PAGINATION_TEXTS.label}
      className="mt-6 flex items-center justify-between"
    >
      <Button onClick={onPrevious} disabled={!hasPreviousPage}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        {PROJECT_PAGINATION_TEXTS.previous}
      </Button>
      <span className="text-sm text-gray-500">{PROJECT_PAGINATION_TEXTS.currentPage(page)}</span>
      <Button onClick={onNext} disabled={!hasNextPage}>
        {PROJECT_PAGINATION_TEXTS.next}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}
