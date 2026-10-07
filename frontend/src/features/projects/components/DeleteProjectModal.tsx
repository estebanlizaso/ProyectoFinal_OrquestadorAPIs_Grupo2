import { useDeleteProject } from '../../../services/projectService'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { PROJECT_DELETE_TEXTS } from '../constants'
import type { ProjectResponse } from '../types'

export type DeleteProjectModalProps = {
  project: ProjectResponse
  onClose: () => void
  onDeleted: () => void
}

export function DeleteProjectModal({ project, onClose, onDeleted }: DeleteProjectModalProps) {
  const { run, status, error } = useDeleteProject()
  const isDeleting = status === 'loading'

  async function handleConfirm(): Promise<void> {
    const wasDeleted = await run(project.projectId)
    if (wasDeleted) {
      onDeleted()
    }
  }

  return (
    <Modal
      title={PROJECT_DELETE_TEXTS.title}
      description={PROJECT_DELETE_TEXTS.description(project.name)}
      onClose={onClose}
      isDismissible={!isDeleting}
    >
      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{PROJECT_DELETE_TEXTS.errorTitle}</p>
          <p>{error.message}</p>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          {PROJECT_DELETE_TEXTS.cancel}
        </Button>
        <Button variant="danger" onClick={() => void handleConfirm()} disabled={isDeleting}>
          {isDeleting ? PROJECT_DELETE_TEXTS.deleting : PROJECT_DELETE_TEXTS.confirm}
        </Button>
      </div>
    </Modal>
  )
}