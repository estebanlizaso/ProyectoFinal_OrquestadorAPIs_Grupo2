import { useId, useState } from 'react'
import { useCreateProject } from '../../../services/projectService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { Modal } from '../../../shared/ui/Modal'
import { PROJECT_CREATE_TEXTS } from '../constants'
import { PROJECT_CREATE_ERROR_MESSAGES } from '../errorMessages'
import type { ProjectResponse } from '../types'

export type CreateProjectModalProps = {
  onClose: () => void
  onCreated: (project: ProjectResponse) => void
}

export function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const inputId = useId()
  const { run, status, error } = useCreateProject()
  const isCreating = status === 'loading'
  const trimmedName = name.trim()

  async function handleSubmit(): Promise<void> {
    if (trimmedName === '') {
      return
    }
    const project = await run(trimmedName)
    if (project) {
      onCreated(project)
    }
  }

  return (
    <Modal
      title={PROJECT_CREATE_TEXTS.title}
      description={PROJECT_CREATE_TEXTS.description}
      onClose={onClose}
      isDismissible={!isCreating}
    >
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-900">
          {PROJECT_CREATE_TEXTS.nameLabel}
        </label>
        <Input
          id={inputId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={PROJECT_CREATE_TEXTS.namePlaceholder}
          disabled={isCreating}
        />
        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">{PROJECT_CREATE_TEXTS.errorTitle}</p>
            <p>{getErrorMessage(error, PROJECT_CREATE_ERROR_MESSAGES)}</p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isCreating}>
            {PROJECT_CREATE_TEXTS.cancel}
          </Button>
          <Button type="submit" disabled={isCreating || trimmedName === ''}>
            {isCreating ? PROJECT_CREATE_TEXTS.creating : PROJECT_CREATE_TEXTS.confirm}
          </Button>
        </div>
      </form>
    </Modal>
  )
}