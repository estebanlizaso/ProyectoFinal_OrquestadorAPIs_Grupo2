import { useState } from 'react'
import { GlobalContextPage } from '../features/global-context'
import { CreateProjectModal, ProjectsPage, type ProjectResponse } from '../features/projects'
import { ProposedArchitecturePage } from '../features/proposed-architecture'
import { navigate } from '../shared/lib/navigate'
import { usePathname } from '../shared/lib/usePathname'
import { AppLayout } from './layout/AppLayout'
import { buildProjectArchitecturePath, buildProjectContextPath, resolveRoute, type AppRoute } from './routes'

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

  function renderPage(currentRoute: AppRoute) {
    switch (currentRoute.name) {
      case 'projectContext':
        return (
          <GlobalContextPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            onGenerateArchitecture={() => navigate(buildProjectArchitecturePath(currentRoute.projectId))}
          />
        )
      case 'projectArchitecture':
        return <ProposedArchitecturePage key={currentRoute.projectId} projectId={currentRoute.projectId} />
      case 'projects':
        return <ProjectsPage onNewOrchestration={openCreateModal} />
    }
  }

  return (
    <AppLayout activeNavItem="projects" onNewOrchestration={openCreateModal}>
      {renderPage(route)}

      {isCreateModalOpen && <CreateProjectModal onClose={closeCreateModal} onCreated={handleCreated} />}
    </AppLayout>
  )
}
