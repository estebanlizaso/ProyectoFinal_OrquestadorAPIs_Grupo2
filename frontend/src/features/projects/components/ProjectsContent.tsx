import { CircleAlert, FolderOpen, SearchX } from 'lucide-react'
import type { RequestStatus } from '../../../shared/api/requestStatus'
import { Button } from '../../../shared/ui/Button'
import { StatusMessage } from '../../../shared/ui/StatusMessage'
import { PROJECT_SEARCH_TEXTS, PROJECTS_PAGE_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { ProjectGrid } from './ProjectGrid'
import { ProjectGridSkeleton } from './ProjectGridSkeleton'

export type ProjectsContentProps = {
  projects: ProjectResponse[]
  status: RequestStatus
  error: Error | null
  searchTerm: string
  onRetry: () => void
  onDeleteProject: (project: ProjectResponse) => void
}

export function ProjectsContent({
  projects,
  status,
  error,
  searchTerm,
  onRetry,
  onDeleteProject,
}: ProjectsContentProps) {
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

  if (projects.length === 0 && searchTerm !== '') {
    return (
      <StatusMessage
        icon={SearchX}
        title={PROJECT_SEARCH_TEXTS.noResultsTitle}
        description={PROJECT_SEARCH_TEXTS.noResultsDescription(searchTerm)}
      />
    )
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