import { useState } from 'react'
import type { ContextMap, OrchestrationNodeResponse } from '../../global-context'
import { useUpdateNodeNotes } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { buildConfigLines } from '../module-detail/buildConfigLines'
import { buildEndpointSlots } from '../module-detail/buildEndpointSlots'
import { canHaveEndpoint } from '../module-detail/canHaveEndpoint'
import { parseModuleNotes } from '../module-detail/parseModuleNotes'
import { MODULE_DETAIL_TEXTS } from '../constants'
import { MODULE_CONFIG_ERROR_MESSAGES } from '../errorMessages'
import type { ModuleConfig } from '../types'
import { validateEndpoint } from '../module-detail/validateEndpoint'
import { EndpointConfiguration } from './EndpointConfiguration'
import { ModuleDescription } from './ModuleDescription'

export type ModuleDetailModalProps = {
  projectId: number
  node: OrchestrationNodeResponse
  map: ContextMap
  onClose: () => void
  onConfigSaved: (node: OrchestrationNodeResponse) => void
}

function buildInitialConfig(node: OrchestrationNodeResponse, map: ContextMap): ModuleConfig {
  return {
    endpoints: buildEndpointSlots(node, map),
    authentication: parseModuleNotes(node.userNotes).authentication,
  }
}

function isSameConfig(first: ModuleConfig, second: ModuleConfig): boolean {
  return JSON.stringify(buildConfigLines(first)) === JSON.stringify(buildConfigLines(second))
}

export function ModuleDetailModal({ projectId, node, map, onClose, onConfigSaved }: ModuleDetailModalProps) {
  const hasEndpoint = canHaveEndpoint(node)
  const [initialConfig] = useState(() => buildInitialConfig(node, map))
  const [config, setConfig] = useState(initialConfig)
  const { run, status, error } = useUpdateNodeNotes()
  const isSaving = status === 'loading'
  const areEndpointsValid = config.endpoints.every(({ endpoint }) => validateEndpoint(endpoint) === null)
  const canSave = !isSaving && areEndpointsValid && !isSameConfig(config, initialConfig)

  async function handleSave(): Promise<void> {
    const updatedNode = await run(projectId, node.key, buildConfigLines(config).join('\n'))
    if (updatedNode) {
      onConfigSaved(updatedNode)
    }
  }

  return (
    <Modal
      title={`${MODULE_DETAIL_TEXTS.titlePrefix}${node.name}`}
      description={MODULE_DETAIL_TEXTS.subtitle}
      onClose={onClose}
      isDismissible={!isSaving}
      size={hasEndpoint ? 'lg' : 'md'}
      closeLabel={MODULE_DETAIL_TEXTS.close}
    >
      <span className="mt-4 inline-block rounded-md bg-primary-blue-light px-2 py-1 text-xs text-primary-blue">
        {MODULE_DETAIL_TEXTS.behaviorTag}
      </span>

      <ModuleDescription description={node.description} />

      {hasEndpoint && (
        <fieldset disabled={isSaving} className="mt-6 min-w-0">
          <EndpointConfiguration
            endpoints={config.endpoints}
            authentication={config.authentication}
            onEndpointChange={(index, changedEndpoint) =>
              setConfig((current) => ({
                ...current,
                endpoints: current.endpoints.map((slot, position) =>
                  position === index ? { ...slot, endpoint: changedEndpoint } : slot,
                ),
              }))
            }
            onAuthenticationChange={(authentication) => setConfig((current) => ({ ...current, authentication }))}
          />
        </fieldset>
      )}

      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{MODULE_DETAIL_TEXTS.saveErrorTitle}</p>
          <p>{getErrorMessage(error, MODULE_CONFIG_ERROR_MESSAGES)}</p>
        </div>
      )}

      <div className="mt-8 flex justify-end gap-2">
        {hasEndpoint ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              {MODULE_DETAIL_TEXTS.cancel}
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSave}>
              {isSaving ? MODULE_DETAIL_TEXTS.saving : MODULE_DETAIL_TEXTS.save}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {MODULE_DETAIL_TEXTS.close}
          </Button>
        )}
      </div>
    </Modal>
  )
}
