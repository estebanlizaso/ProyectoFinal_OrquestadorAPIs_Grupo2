import { CircleAlert } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useProjectProgress } from '../services/projectProgressService'
import { getErrorMessage } from '../shared/api/getErrorMessage'
import { navigate } from '../shared/lib/navigate'
import { Button } from '../shared/ui/Button'
import { Skeleton } from '../shared/ui/Skeleton'
import { StatusMessage } from '../shared/ui/StatusMessage'
import { FINISHED_PROJECT_GUARD_TEXTS } from './constants'
import { buildProjectResultsPath } from './routes'

export type FinishedProjectGuardProps = {
  projectId: number
  children: ReactNode
}

/** Un proyecto finalizado no puede volver a las pantallas de edición: se lo manda a Resultados. */
export function FinishedProjectGuard({ projectId, children }: FinishedProjectGuardProps) {
  const { progress, status, error, retry } = useProjectProgress(projectId)
  const isFinished = progress?.finish_proyect === true

  useEffect(() => {
    if (isFinished) {
      navigate(buildProjectResultsPath(projectId), { replace: true })
    }
  }, [isFinished, projectId])

  if (status === 'error') {
    return (
      <div className="p-8">
        <StatusMessage
          icon={CircleAlert}
          tone="error"
          title={FINISHED_PROJECT_GUARD_TEXTS.errorTitle}
          description={error ? getErrorMessage(error) : undefined}
          action={
            <Button variant="secondary" onClick={retry}>
              {FINISHED_PROJECT_GUARD_TEXTS.retry}
            </Button>
          }
        />
      </div>
    )
  }
  if (status !== 'success' || isFinished) {
    return (
      <div role="status" aria-label={FINISHED_PROJECT_GUARD_TEXTS.loading} className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  return children
}
