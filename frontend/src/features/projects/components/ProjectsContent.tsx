import { CircleAlert, FolderOpen } from 'lucide-react'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { Button } from '../../../shared/ui/Button'
import { StatusMessage } from '../../../shared/ui/StatusMessage'
import { PROJECTS_PAGE_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { ProjectGrid } from './ProjectGrid'
import { ProjectGridSkeleton } from './ProjectGridSkeleton'

export type ProjectsContentProps = {
  projects: ProjectResponse[]
  status: RequestStatus
  error: Error | null
  onRetry: () => void
  onDeleteProject: (project: ProjectResponse) => void
}

export function ProjectsContent({ projects, status, error, onRetry, onDeleteProject }: ProjectsContentProps) {
  if (status === 'error') {
    return (
      <StatusMessage
        icon={CircleAlert}
        tone="error"
        title={PROJECTS_PAGE_TEXTS.errorTitle}
        description={error?.message}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {PROJECTS_PAGE_TEXTS.retry}
          </Button>
        }
      />
    )
  }

  if (status !== 'success') {
    return <ProjectGridSkeleton />
  }

  if (projects.length === 0) {
    return (
      <StatusMessage
        icon={FolderOpen}
        title={PROJECTS_PAGE_TEXTS.emptyTitle}
        description={PROJECTS_PAGE_TEXTS.emptyDescription}
      />
    )
  }

  return <ProjectGrid projects={projects} onDelete={onDeleteProject} />
}