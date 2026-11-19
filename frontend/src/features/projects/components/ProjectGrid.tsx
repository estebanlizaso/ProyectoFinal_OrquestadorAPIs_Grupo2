import { CardGrid } from '../../../shared/ui/CardGrid'
import type { ProjectResponse } from '../types'
import { ProjectCard } from './ProjectCard'

export type ProjectGridProps = {
  projects: ProjectResponse[]
  onDelete?: (project: ProjectResponse) => void
  onOpenFlow?: (project: ProjectResponse) => void
}

export function ProjectGrid({ projects, onDelete, onOpenFlow }: ProjectGridProps) {
  return (
    <CardGrid>
      {projects.map((project) => (
        <ProjectCard key={project.projectId} project={project} onDelete={onDelete} onOpenFlow={onOpenFlow} />
      ))}
    </CardGrid>
  )
}