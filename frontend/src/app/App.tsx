import { useState, type ReactNode } from 'react'
import { GenerationExecutionPage } from '../features/generation-execution'
import { GlobalContextPage } from '../features/global-context'
import { CreateProjectModal, ProjectsPage, type ProjectResponse } from '../features/projects'
import { ProposedArchitecturePage, useModuleNotesSync } from '../features/proposed-architecture'
import { ResultsPage } from '../features/results'
import { navigate } from '../shared/lib/navigate'
import { usePathname } from '../shared/lib/usePathname'
import { BackButton } from '../shared/ui/BackButton'
import { APP_TEXTS } from './constants'
import { FinishedProjectGuard } from './FinishedProjectGuard'
import { AppLayout } from './layout/AppLayout'
import {
  buildProjectArchitecturePath,
  buildProjectContextPath,
  buildProjectGenerationPath,
  buildProjectResultsPath,
  PROJECTS_PATH,
  resolveBackTarget,
  resolveRoute,
  type AppRoute,
} from './routes'

export function App() {
  const route = resolveRoute(usePathname())
  const backTarget = resolveBackTarget(route)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const syncModuleNotes = useModuleNotesSync()
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

  function guardEditableRoute(currentRoute: AppRoute & { projectId: number }, page: ReactNode) {
    return (
      <FinishedProjectGuard key={`${currentRoute.name}-${currentRoute.projectId}`} projectId={currentRoute.projectId}>
        {page}
      </FinishedProjectGuard>
    )
  }

  function renderPage(currentRoute: AppRoute) {
    switch (currentRoute.name) {
      case 'projectContext':
        return guardEditableRoute(
          currentRoute,
          <GlobalContextPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            onGenerateArchitecture={() => navigate(buildProjectArchitecturePath(currentRoute.projectId))}
            onMapChanged={(previousMap, nextMap) => syncModuleNotes(currentRoute.projectId, previousMap, nextMap)}
          />,
        )
      case 'projectArchitecture':
        return guardEditableRoute(
          currentRoute,
          <ProposedArchitecturePage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            onConfirmFlow={() => navigate(buildProjectGenerationPath(currentRoute.projectId))}
          />,
        )
      case 'projectGeneration':
        return guardEditableRoute(
          currentRoute,
          <GenerationExecutionPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            backButton={backButton}
            assistantSide={assistantSide}
            onCompleted={() => navigate(buildProjectResultsPath(currentRoute.projectId), { replace: true })}
          />,
        )
      case 'projectResults':
        return (
          <ResultsPage
            key={currentRoute.projectId}
            projectId={currentRoute.projectId}
            onBackToProjects={() => navigate(PROJECTS_PATH)}
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
