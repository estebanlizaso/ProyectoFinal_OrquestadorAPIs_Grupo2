import { useState } from 'react'
import { useProjects } from '../../../services/projectService'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Section } from '../../../shared/ui/Section'
import { PROJECTS_PAGE_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { DeleteProjectModal } from './DeleteProjectModal'
import { ProjectsContent } from './ProjectsContent'

export function ProjectsPage() {
  const { projects, run, status, error } = useProjects()
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)

  function handleDeleted(): void {
    setProjectToDelete(null)
    void run()
  }

  return (
    <div className="p-8">
      <PageHeader
        title={PROJECTS_PAGE_TEXTS.title}
        subtitle={PROJECTS_PAGE_TEXTS.subtitle}
        actions={<Button>{PROJECTS_PAGE_TEXTS.newOrchestration}</Button>}
      />

      <div className="mb-6 h-10 max-w-md" />

      <Section title={PROJECTS_PAGE_TEXTS.recent}>
        <ProjectsContent
          projects={projects}
          status={status}
          error={error}
          onRetry={() => void run()}
          onDeleteProject={setProjectToDelete}
        />
      </Section>

      {projectToDelete && (
        <DeleteProjectModal
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}