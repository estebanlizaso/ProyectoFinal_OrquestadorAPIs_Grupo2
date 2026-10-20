import { PageHeader } from '../shared/ui/PageHeader'
import { APP_TEXTS } from './constants'

export type ProjectContextPlaceholderProps = {
  projectId: number
}

export function ProjectContextPlaceholder({ projectId }: ProjectContextPlaceholderProps) {
  return (
    <div className="p-8">
      <PageHeader
        title={APP_TEXTS.projectContext}
        subtitle={APP_TEXTS.projectContextPending(projectId)}
      />
    </div>
  )
}