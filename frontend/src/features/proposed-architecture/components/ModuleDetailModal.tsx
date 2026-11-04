import { useState } from 'react'
import type { OrchestrationNodeResponse, OrchestrationRelationResponse } from '../../global-context'
import { useUpdateNodeNotes } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { buildConfigLines } from '../module-detail/buildConfigLines'
import { canHaveEndpoint } from '../module-detail/canHaveEndpoint'
import { MODULE_DETAIL_TEXTS } from '../constants'
import { MODULE_CONFIG_ERROR_MESSAGES } from '../errorMessages'
import { findModuleEndpoints } from '../module-detail/findModuleEndpoints'
import type { ModuleConfig, ModuleEndpoint } from '../types'
import { validateEndpoint } from '../module-detail/validateEndpoint'
import { EndpointConfiguration } from './EndpointConfiguration'
import { ModuleDescription } from './ModuleDescription'
import { SpecificationImport } from './SpecificationImport'

export type ModuleDetailModalProps = {
  projectId: number
  node: OrchestrationNodeResponse
  relations: OrchestrationRelationResponse[]
  savedConfig: ModuleConfig | null
  onClose: () => void
  onConfigSaved: (node: OrchestrationNodeResponse, config: ModuleConfig) => void
}

const EMPTY_ENDPOINT: ModuleEndpoint = { method: '', route: '' }

function buildInitialConfig(
  nodeKey: string,
  relations: OrchestrationRelationResponse[],
  savedConfig: ModuleConfig | null,
): ModuleConfig {
  const endpoints = savedConfig ? savedConfig.endpoints : findModuleEndpoints(nodeKey, relations)
  return {
    endpoints: endpoints.length > 0 ? endpoints : [EMPTY_ENDPOINT],
    authentication: savedConfig?.authentication ?? '',
  }
}

function toSavedConfig({ endpoints, authentication }: ModuleConfig): ModuleConfig {
  return {
    endpoints: endpoints.filter(({ method, route }) => method !== '' && route !== ''),
    authentication,
  }
}

function isSameConfig(first: ModuleConfig, second: ModuleConfig): boolean {
  return JSON.stringify(toSavedConfig(first)) === JSON.stringify(toSavedConfig(second))
}

export function ModuleDetailModal({
  projectId,
  node,
  relations,
  savedConfig,
  onClose,
  onConfigSaved,
}: ModuleDetailModalProps) {
  const hasEndpoint = canHaveEndpoint(node)
  const [initialConfig] = useState(() => buildInitialConfig(node.key, relations, savedConfig))
  const [config, setConfig] = useState(initialConfig)
  const { run, status, error } = useUpdateNodeNotes()
  const isSaving = status === 'loading'
  const areEndpointsValid = config.endpoints.every((endpoint) => validateEndpoint(endpoint) === null)
  const canSave = !isSaving && areEndpointsValid && !isSameConfig(config, initialConfig)

  async function handleSave(): Promise<void> {
    const configToSave = toSavedConfig(config)
    const updatedNode = await run(projectId, node.key, buildConfigLines(configToSave).join('\n'))
    if (updatedNode) {
      onConfigSaved(updatedNode, configToSave)
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
        <fieldset disabled={isSaving} className="mt-6 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
          <EndpointConfiguration
            endpoints={config.endpoints}
            authentication={config.authentication}
            onEndpointChange={(index, changedEndpoint) =>
              setConfig((current) => ({
                ...current,
                endpoints: current.endpoints.map((endpoint, position) =>
                  position === index ? changedEndpoint : endpoint,
                ),
              }))
            }
            onAuthenticationChange={(authentication) => setConfig((current) => ({ ...current, authentication }))}
          />
          <SpecificationImport />
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
