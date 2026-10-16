import { useState } from 'react'
import { formatDateOnly } from '../../../shared/lib/formatDateOnly'
import { getJson } from '../../../shared/api/httpClient'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { PROJECT_CARD_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'
import { ProjectCardMenu } from './ProjectCardMenu'

export type ProjectCardProps = {
  project: ProjectResponse
  onDelete?: (project: ProjectResponse) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const {
    name,
    description,
    created_at: createdAt,
    projectId,
  } = project

  const [copyMessage, setCopyMessage] = useState('')
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)

  async function handleCopyPrompt(): Promise<void> {
    setIsLoadingPrompt(true)
    setCopyMessage('')

    try {
      const response = await getJson<{ initialPrompt: string }>(
        `/projects/${projectId}/context`,
      )

      const blob = new Blob([response.initialPrompt], {
        type: 'text/plain;charset=utf-8',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `prompt-inicial-proyecto-${projectId}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setCopyMessage('Se descargó el archivo .txt.')
    } catch {
      setCopyMessage('No se pudo obtener el contexto del proyecto.')
    } finally {
      setIsLoadingPrompt(false)
    }
  }

  return (
    <Card className="flex h-full flex-col gap-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-full bg-gray-100"
          />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
            {createdAt && (
              <p className="text-xs text-gray-400">
                {PROJECT_CARD_TEXTS.createdAt}{' '}
                <time dateTime={createdAt}>{formatDateOnly(createdAt)}</time>
              </p>
            )}
          </div>
        </div>

        {onDelete && (
          <ProjectCardMenu
            onDelete={() => onDelete(project)}
            onCopyPrompt={handleCopyPrompt}
          />
        )}
      </header>

      <p className="text-sm text-gray-500">
        {description || PROJECT_CARD_TEXTS.noDescription}
      </p>

      {isLoadingPrompt && (
        <p role="status" className="text-xs text-gray-500">
          Obteniendo contexto...
        </p>
      )}

      {copyMessage && (
        <p role="status" className="text-xs text-gray-600">
          {copyMessage}
        </p>
      )}

      <footer className="mt-auto">
        <Button variant="soft" size="sm" disabled>
          {PROJECT_CARD_TEXTS.openFlow}
        </Button>
      </footer>
    </Card>
  )
}