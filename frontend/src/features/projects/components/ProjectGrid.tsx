import { CardGrid } from '../../../shared/ui/CardGrid'
import type { ProjectResponse } from '../types'
import { ProjectCard } from './ProjectCard'

export type ProjectGridProps = {
  projects: ProjectResponse[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <CardGrid>
      {projects.map((project) => (
        <ProjectCard key={project.projectId} project={project} />
      ))}
    </CardGrid>
  )
}
