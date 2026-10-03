import { EllipsisVertical } from 'lucide-react'
import { PROJECT_CARD_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'

export type ProjectCardProps = {
  project: ProjectResponse
  onDelete?: (projectId: ProjectResponse['projectId']) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { name, description, created_at: createdAt } = project

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{name}</h3>
        {onDelete && (
          <button
            type="button"
            aria-label={PROJECT_CARD_TEXTS.actionsMenu}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <EllipsisVertical className="size-4" aria-hidden="true" />
          </button>
        )}
      </header>

      <p className="text-sm text-slate-600">{description ?? PROJECT_CARD_TEXTS.noDescription}</p>

      {createdAt && (
        <p className="text-xs text-slate-500">
          {PROJECT_CARD_TEXTS.createdAt} <time dateTime={createdAt}>{createdAt}</time>
        </p>
      )}

      <footer>
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {PROJECT_CARD_TEXTS.openFlow}
        </button>
      </footer>
    </article>
  )
}
