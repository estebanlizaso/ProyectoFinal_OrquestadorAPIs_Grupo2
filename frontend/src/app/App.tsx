import { ProjectsPage } from '../features/projects'
import { AppLayout } from './layout/AppLayout'

export function App() {
  return (
    <AppLayout activeNavItem="projects">
      <ProjectsPage />
    </AppLayout>
  )
}
