import { useState } from 'react'
import {
  findLatestValidTurn,
  useContextHistory,
  type OrchestrationNodeResponse,
  type ProjectContextResponse,
} from '../../global-context'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { ModuleConfig } from '../types'
import { useModuleConfigs } from '../useModuleConfigs'
import { AiAssistantPanel } from './AiAssistantPanel'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { ModuleDetailModal } from './ModuleDetailModal'

export type ProposedArchitecturePageProps = {
  projectId: number
}

export function ProposedArchitecturePage({ projectId }: ProposedArchitecturePageProps) {
  const { turns, map, addTurn } = useContextHistory(projectId)
  const flowSummary = findLatestValidTurn(turns)?.planner.summary ?? null
  const { configs, saveConfig } = useModuleConfigs(projectId)
  const [openModule, setOpenModule] = useState<OrchestrationNodeResponse | null>(null)

  function handleRuleSaved(
    nodeKey: string,
    prompt: string,
    context: ProjectContextResponse,
    config: ModuleConfig | null,
  ): void {
    if (config) {
      saveConfig(nodeKey, config)
    }
    if (context.planner) {
      addTurn({ prompt, planner: context.planner }, { nodes: context.nodes, relations: context.relations })
    }
    setOpenModule(null)
  }

  return (
    <div className="p-8">
      <PageHeader
        title={PROPOSED_ARCHITECTURE_PAGE_TEXTS.title}
        subtitle={PROPOSED_ARCHITECTURE_PAGE_TEXTS.subtitle}
        actions={<Button disabled>{PROPOSED_ARCHITECTURE_PAGE_TEXTS.confirmFlow}</Button>}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <ArchitectureDiagram map={map} onModuleOpen={setOpenModule} />
        <AiAssistantPanel flowSummary={flowSummary} />
      </div>

      {openModule && (
        <ModuleDetailModal
          key={openModule.key}
          projectId={projectId}
          node={openModule}
          relations={map.relations}
          savedConfig={configs[openModule.key] ?? null}
          onClose={() => setOpenModule(null)}
          onRuleSaved={(prompt, context, config) => handleRuleSaved(openModule.key, prompt, context, config)}
        />
      )}
    </div>
  )
}
