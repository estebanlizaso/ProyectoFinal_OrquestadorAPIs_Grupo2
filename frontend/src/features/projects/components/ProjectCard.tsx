import { useProjectContextExport } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { downloadTextFile } from '../../../shared/lib/downloadTextFile'
import { formatDateOnly } from '../../../shared/lib/formatDateOnly'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { buildProjectContextMarkdown } from '../buildProjectContextMarkdown'
import { buildProjectContextFileName, MARKDOWN_MIME_TYPE, PROJECT_CARD_TEXTS } from '../constants'
import { PROJECT_CONTEXT_DOWNLOAD_ERROR_MESSAGES } from '../errorMessages'
import type { ProjectResponse } from '../types'
import { ProjectCardMenu } from './ProjectCardMenu'

export type ProjectCardProps = {
  project: ProjectResponse
  onDelete?: (project: ProjectResponse) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { projectId, name, description, created_at: createdAt } = project
  const { run: fetchContextExport, status: contextStatus, error: contextError } = useProjectContextExport()

  async function handleDownloadContext(): Promise<void> {
    const contextExport = await fetchContextExport(projectId)
    if (contextExport !== null) {
      const markdown = buildProjectContextMarkdown({ projectName: name, ...contextExport })
      downloadTextFile(buildProjectContextFileName(projectId), markdown, MARKDOWN_MIME_TYPE)
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
          onDownloadContext={() => void handleDownloadContext()}
          isDownloadingContext={contextStatus === 'loading'}
          downloadContextError={
            contextError && getErrorMessage(contextError, PROJECT_CONTEXT_DOWNLOAD_ERROR_MESSAGES)
          }
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