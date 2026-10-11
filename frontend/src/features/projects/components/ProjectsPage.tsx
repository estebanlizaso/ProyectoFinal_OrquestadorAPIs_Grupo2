import { useState } from 'react'
import { useProjects } from '../../../services/projectService'
import { useDebouncedValue } from '../../../shared/lib/useDebouncedValue'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Section } from '../../../shared/ui/Section'
import { FIRST_PAGE, PROJECTS_PAGE_TEXTS, SEARCH_DEBOUNCE_MS } from '../constants'
import type { ProjectResponse } from '../types'
import { DeleteProjectModal } from './DeleteProjectModal'
import { ProjectPagination } from './ProjectPagination'
import { ProjectSearch } from './ProjectSearch'
import { ProjectsContent } from './ProjectsContent'

export function ProjectsPage() {
  const [query, setQuery] = useState('')
  const searchTerm = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const [page, setPage] = useState(FIRST_PAGE)
  const [pageSearchTerm, setPageSearchTerm] = useState(searchTerm)

  if (pageSearchTerm !== searchTerm) {
    setPageSearchTerm(searchTerm)
    setPage(FIRST_PAGE)
  }

  const { projects, hasPreviousPage, hasNextPage, run, status, error } = useProjects(
    searchTerm,
    page,
  )
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)

  function handleDeleted(): void {
    setProjectToDelete(null)
    if (projects.length === 1 && hasPreviousPage) {
      setPage((current) => current - 1)
      return
    }
    void run()
  }

  return (
    <div className="p-8">
      <PageHeader
        title={PROJECTS_PAGE_TEXTS.title}
        subtitle={PROJECTS_PAGE_TEXTS.subtitle}
        actions={<Button>{PROJECTS_PAGE_TEXTS.newOrchestration}</Button>}
      />

      <div className="mb-6 max-w-md">
        <ProjectSearch value={query} onChange={setQuery} />
      </div>

      <Section title={PROJECTS_PAGE_TEXTS.recent}>
        <ProjectsContent
          projects={projects}
          status={status}
          error={error}
          searchTerm={searchTerm}
          onRetry={() => void run()}
          onDeleteProject={setProjectToDelete}
          pagination={
            <ProjectPagination
              page={page}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPrevious={() => setPage((current) => current - 1)}
              onNext={() => setPage((current) => current + 1)}
            />
          }
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