import { CardGrid } from '../../../shared/ui/CardGrid'
import { PROJECTS_PAGE_TEXTS, SKELETON_CARD_COUNT } from '../constants'
import { ProjectCardSkeleton } from './ProjectCardSkeleton'

const SKELETON_KEYS = Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => index)

export function ProjectGridSkeleton() {
  return (
    <div role="status" aria-label={PROJECTS_PAGE_TEXTS.loading} aria-busy="true">
      <CardGrid>
        {SKELETON_KEYS.map((key) => (
          <ProjectCardSkeleton key={key} />
        ))}
      </CardGrid>
    </div>
  )
}
