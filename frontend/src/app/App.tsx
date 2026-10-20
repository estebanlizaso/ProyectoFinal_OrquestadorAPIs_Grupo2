import { useState } from 'react'
import { CreateProjectModal, ProjectsPage, type ProjectResponse } from '../features/projects'
import { navigate } from '../shared/lib/navigate'
import { usePathname } from '../shared/lib/usePathname'
import { ProjectContextPlaceholder } from './ProjectContextPlaceholder'
import { AppLayout } from './layout/AppLayout'
import { buildProjectContextPath, resolveRoute } from './routes'

export function App() {
  const route = resolveRoute(usePathname())
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  function openCreateModal(): void {
    setIsCreateModalOpen(true)
  }

  function closeCreateModal(): void {
    setIsCreateModalOpen(false)
  }

  function handleCreated(project: ProjectResponse): void {
    closeCreateModal()
    navigate(buildProjectContextPath(project.projectId))
  }

  return (
    <AppLayout activeNavItem="projects" onNewOrchestration={openCreateModal}>
      {route.name === 'projectContext' ? (
        <ProjectContextPlaceholder projectId={route.projectId} />
      ) : (
        <ProjectsPage onNewOrchestration={openCreateModal} />
      )}

      {isCreateModalOpen && <CreateProjectModal onClose={closeCreateModal} onCreated={handleCreated} />}
    </AppLayout>
  )
}