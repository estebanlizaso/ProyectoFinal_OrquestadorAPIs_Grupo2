import { useState } from 'react'
import type {
  OrchestrationNodeResponse,
  OrchestrationRelationResponse,
  ProjectContextResponse,
} from '../../global-context'
import { useSaveNodeRule } from '../../../services/projectContextService'
import { getErrorMessage } from '../../../shared/api/getErrorMessage'
import { Button } from '../../../shared/ui/Button'
import { Modal } from '../../../shared/ui/Modal'
import { buildModuleNotes } from '../module-detail/buildModuleNotes'
import { buildRuleUpdatedPrompt } from '../module-detail/buildRuleUpdatedPrompt'
import { canHaveEndpoint } from '../module-detail/canHaveEndpoint'
import { MODULE_DETAIL_TEXTS, RULE_MIN_LENGTH } from '../constants'
import { MODULE_RULE_ERROR_MESSAGES } from '../errorMessages'
import { findModuleEndpoints } from '../module-detail/findModuleEndpoints'
import { getModuleRule } from '../module-detail/getModuleRule'
import type { ModuleConfig, ModuleEndpoint } from '../types'
import { validateEndpoint } from '../module-detail/validateEndpoint'
import { BehaviorRuleField } from './BehaviorRuleField'
import { EndpointConfiguration } from './EndpointConfiguration'
import { SpecificationImport } from './SpecificationImport'

export type ModuleDetailModalProps = {
  projectId: number
  node: OrchestrationNodeResponse
  relations: OrchestrationRelationResponse[]
  savedConfig: ModuleConfig | null
  onClose: () => void
  onRuleSaved: (prompt: string, context: ProjectContextResponse, config: ModuleConfig | null) => void
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
  onRuleSaved,
}: ModuleDetailModalProps) {
  const hasEndpoint = canHaveEndpoint(node)
  const [initialRule] = useState(() => getModuleRule(node))
  const [initialConfig] = useState(() => buildInitialConfig(node.key, relations, savedConfig))
  const [rule, setRule] = useState(initialRule)
  const [config, setConfig] = useState(initialConfig)
  const { run, status, error } = useSaveNodeRule()
  const isSaving = status === 'loading'
  const trimmedRule = rule.trim()
  const isRuleValid = trimmedRule.length >= RULE_MIN_LENGTH
  const areEndpointsValid = config.endpoints.every((endpoint) => validateEndpoint(endpoint) === null)
  const hasChanges = trimmedRule !== initialRule.trim() || (hasEndpoint && !isSameConfig(config, initialConfig))
  const canSave = !isSaving && isRuleValid && (!hasEndpoint || areEndpointsValid) && hasChanges

  async function handleSaveRule(): Promise<void> {
    const configToSave = hasEndpoint ? toSavedConfig(config) : null
    const prompt = buildRuleUpdatedPrompt(node.name, trimmedRule, configToSave)
    const updatedContext = await run(projectId, node.key, buildModuleNotes(trimmedRule, configToSave), prompt)
    if (updatedContext) {
      onRuleSaved(prompt, updatedContext, configToSave)
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
      <fieldset disabled={isSaving} className="min-w-0">
        <span className="mt-4 inline-block rounded-md bg-primary-blue-light px-2 py-1 text-xs text-primary-blue">
          {MODULE_DETAIL_TEXTS.behaviorTag}
        </span>

        <BehaviorRuleField value={rule} onChange={setRule} />

        {hasEndpoint && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
          </div>
        )}
      </fieldset>

      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">{MODULE_DETAIL_TEXTS.saveErrorTitle}</p>
          <p>{getErrorMessage(error, MODULE_RULE_ERROR_MESSAGES)}</p>
        </div>
      )}

      <div className="mt-8 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          {MODULE_DETAIL_TEXTS.cancel}
        </Button>
        <Button onClick={() => void handleSaveRule()} disabled={!canSave}>
          {isSaving ? MODULE_DETAIL_TEXTS.savingRule : MODULE_DETAIL_TEXTS.saveRule}
        </Button>
      </div>
    </Modal>
  )
}
