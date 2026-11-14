import { cn } from '../../../shared/lib/cn'
import { ASSISTANT_PANEL_TABS_TEXTS } from '../constants'
import type { AssistantPanelTab } from '../types'

export type AssistantPanelTabsProps = {
  activeTab: AssistantPanelTab
  onTabChange: (tab: AssistantPanelTab) => void
}

const TABS: AssistantPanelTab[] = ['chat', 'summary']

export function AssistantPanelTabs({ activeTab, onTabChange }: AssistantPanelTabsProps) {
  return (
    <div role="tablist" aria-label={ASSISTANT_PANEL_TABS_TEXTS.label} className="flex gap-6 border-b border-gray-100">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === activeTab}
          onClick={() => onTabChange(tab)}
          className={cn(
            '-mb-px cursor-pointer border-b-2 pb-3 text-lg leading-none font-bold transition-colors',
            tab === activeTab
              ? 'border-primary-blue text-gray-900'
              : 'border-transparent text-gray-400 hover:text-gray-600',
          )}
        >
          {ASSISTANT_PANEL_TABS_TEXTS[tab]}
        </button>
      ))}
    </div>
  )
}
