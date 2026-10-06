import { formatDateOnly } from '../../../shared/lib/formatDateOnly'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { PROJECT_CARD_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { ProjectCardMenu } from './ProjectCardMenu'

export type ProjectCardProps = {
  project: ProjectResponse
  onDelete?: (project: ProjectResponse) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { name, description, created_at: createdAt } = project

  return (
    <Card className="flex h-full flex-col gap-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-gray-100" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
            {createdAt && (
              <p className="text-xs text-gray-400">
                {PROJECT_CARD_TEXTS.createdAt} <time dateTime={createdAt}>{formatDateOnly(createdAt)}</time>
              </p>
            )}
          </div>
        </div>
        {onDelete && <ProjectCardMenu onDelete={() => onDelete(project)} />}
      </header>

      <p className="text-sm text-gray-500">{description || PROJECT_CARD_TEXTS.noDescription}</p>

      <footer className="mt-auto">
        <Button variant="soft" size="sm" disabled>
          {PROJECT_CARD_TEXTS.openFlow}
        </Button>
      </footer>
    </Card>
  )
}