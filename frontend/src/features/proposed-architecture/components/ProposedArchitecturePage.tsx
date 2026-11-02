import { useState } from 'react'
import {
  ContextChatPanel,
  useContextHistory,
  type OrchestrationNodeResponse,
  type ProjectContextResponse,
} from '../../global-context'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { PROPOSED_ARCHITECTURE_PAGE_TEXTS } from '../constants'
import type { ModuleConfig } from '../types'
import { useModuleConfigs } from '../useModuleConfigs'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { ModuleDetailModal } from './ModuleDetailModal'

export type ProposedArchitecturePageProps = {
  projectId: number
}

export function ProposedArchitecturePage({ projectId }: ProposedArchitecturePageProps) {
  const { turns, map, addTurn } = useContextHistory(projectId)
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
    <div className="grid grid-cols-1 items-start gap-6 p-8 lg:h-full lg:grid-cols-3 lg:grid-rows-1">
      <div className="flex flex-col lg:col-span-2 lg:h-full">
        <PageHeader
          title={PROPOSED_ARCHITECTURE_PAGE_TEXTS.title}
          subtitle={PROPOSED_ARCHITECTURE_PAGE_TEXTS.subtitle}
          actions={<Button disabled>{PROPOSED_ARCHITECTURE_PAGE_TEXTS.confirmFlow}</Button>}
        />
        <ArchitectureDiagram map={map} onModuleOpen={setOpenModule} />
      </div>
      <ContextChatPanel projectId={projectId} turns={turns} onTurnAdded={addTurn} />

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
