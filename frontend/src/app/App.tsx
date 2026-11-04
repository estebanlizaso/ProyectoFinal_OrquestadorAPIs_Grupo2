import { useState } from 'react'
import { GenerationExecutionPage } from '../features/generation-execution'
import { GlobalContextPage } from '../features/global-context'
import { CreateProjectModal, ProjectsPage, type ProjectResponse } from '../features/projects'
import { ProposedArchitecturePage } from '../features/proposed-architecture'
import { navigate } from '../shared/lib/navigate'
import { usePathname } from '../shared/lib/usePathname'
import { BackButton } from '../shared/ui/BackButton'
import { APP_TEXTS } from './constants'
import { AppLayout } from './layout/AppLayout'
import {
  buildProjectArchitecturePath,
  buildProjectContextPath,
  buildProjectGenerationPath,
  resolveBackTarget,
  resolveRoute,
  type AppRoute,
} from './routes'

export function App() {
  const route = resolveRoute(usePathname())
  const backTarget = resolveBackTarget(route)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const assistantSide = isSidebarOpen ? 'right' : 'left'

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

  const backButton = backTarget && (
    <BackButton
      label={`${APP_TEXTS.backTo}${backTarget.screenName}`}
      onClick={() => navigate(backTarget.path)}
    />
  )

  function renderPage(currentRoute: AppRoute) {
    switch (currentRoute.name) {
      case 'projectContext':
        return (
          <GlobalContextPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            onGenerateArchitecture={() => navigate(buildProjectArchitecturePath(currentRoute.projectId))}
          />
        )
      case 'projectArchitecture':
        return (
          <ProposedArchitecturePage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            assistantSide={assistantSide}
            onConfirmFlow={() => navigate(buildProjectGenerationPath(currentRoute.projectId))}
          />
        )
      case 'projectGeneration':
        return (
          <GenerationExecutionPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            assistantSide={assistantSide}
          />
        )
      case 'projects':
        return <ProjectsPage onNewOrchestration={openCreateModal} />
    }
  }

  return (
    <AppLayout
      activeNavItem="projects"
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
      onNewOrchestration={openCreateModal}
    >
      {renderPage(route)}

      {isCreateModalOpen && <CreateProjectModal onClose={closeCreateModal} onCreated={handleCreated} />}
    </AppLayout>
  )
}
