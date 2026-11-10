import { useInitialPrompt } from '../../../services/projectContextService'
import { downloadTextFile } from '../../../shared/lib/downloadTextFile'
import { formatDateOnly } from '../../../shared/lib/formatDateOnly'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { buildInitialPromptFileName, PROJECT_CARD_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { ProjectCardMenu } from './ProjectCardMenu'

export type ProjectCardProps = {
  project: ProjectResponse
  onDelete?: (project: ProjectResponse) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { projectId, name, description, created_at: createdAt } = project
  const { run: fetchInitialPrompt, status: promptStatus } = useInitialPrompt()

  async function handleDownloadPrompt(): Promise<void> {
    const prompt = await fetchInitialPrompt(projectId)
    if (prompt !== null) {
      downloadTextFile(buildInitialPromptFileName(projectId), prompt)
    }
  }

  return (
    <Card className="flex h-full flex-col gap-3">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
          {createdAt && (
            <p className="text-xs text-gray-400">
              {PROJECT_CARD_TEXTS.createdAt} <time dateTime={createdAt}>{formatDateOnly(createdAt)}</time>
            </p>
          )}
        </div>
        <ProjectCardMenu
          onDownloadPrompt={() => void handleDownloadPrompt()}
          isDownloadingPrompt={promptStatus === 'loading'}
          hasDownloadPromptError={promptStatus === 'error'}
          onDelete={onDelete && (() => onDelete(project))}
        />
      </header>

      <p className="text-sm text-gray-500">{description || PROJECT_CARD_TEXTS.noDescription}</p>

      <footer className="mt-auto">
        <Button variant="soft" size="sm" disabled>
          {PROJECT_CARD_TEXTS.openFlow}
        </Button>
      </footer>
    </Card>
  )
}