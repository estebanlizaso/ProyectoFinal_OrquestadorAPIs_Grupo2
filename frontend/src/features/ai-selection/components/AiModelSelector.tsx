import { useId } from 'react'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Select } from '../../../shared/ui/Select'
import type { AiModelsResponse, AiSelectionRequest } from '../types'
import type { RequestStatus } from '../../../shared/api/requestStatus'

export type AiModelSelectorProps = {
  catalog: AiModelsResponse | null
  status: RequestStatus
  error: Error | null
  retry: () => void
  selection: AiSelectionRequest | null
  onSelect: (selection: AiSelectionRequest) => void
  selectionUnavailable: boolean
  storageUnavailable: boolean
  disabled: boolean
}

function selectionValue(selection: AiSelectionRequest): string {
  return JSON.stringify([selection.provider, selection.model])
}

export function AiModelSelector({
  catalog, status, error, retry, selection, onSelect, selectionUnavailable, storageUnavailable, disabled,
}: AiModelSelectorProps) {
  const id = useId()
  const models = catalog?.providers.flatMap((provider) =>
    provider.models.map((model) => ({ provider: provider.id, model: model.id, name: model.name })),
  ) ?? []

  return (
    <div className="space-y-2 text-sm">
      <label htmlFor={id} className="block font-medium text-gray-700">Modelo de IA</label>
      {status === 'loading' && <p role="status">Cargando modelos de IA...</p>}
      {status === 'error' && (
        <div role="alert">
          <p>No se pudo cargar el catálogo de modelos. {error && getErrorMessage(error)}</p>
          <Button type="button" variant="secondary" onClick={retry}>Reintentar</Button>
        </div>
      )}
      {status === 'success' && (
        <>
          <Select
            id={id}
            value={selection ? selectionValue(selection) : ''}
            disabled={disabled || models.length === 0}
            onChange={(event) => {
              const model = models.find((item) => selectionValue(item) === event.target.value)
              if (model) onSelect({ provider: model.provider, model: model.model })
            }}
          >
            {!selection && <option value="">Seleccioná un modelo</option>}
            {models.map((model) => (
              <option key={selectionValue(model)} value={selectionValue(model)}>
                {model.provider} · {model.name}
              </option>
            ))}
          </Select>
          {models.length === 0 && <p role="alert">No hay modelos de IA configurados.</p>}
          {selectionUnavailable && <p role="alert">El modelo guardado ya no está disponible. Elegí otro.</p>}
          {!selection && models.length > 0 && !selectionUnavailable && (
            <p>Seleccioná un modelo para enviar mensajes.</p>
          )}
        </>
      )}
      {storageUnavailable && (
        <p role="alert">No se pudo guardar la selección para esta sesión. Puede perderse al cambiar de pantalla.</p>
      )}
    </div>
  )
}
