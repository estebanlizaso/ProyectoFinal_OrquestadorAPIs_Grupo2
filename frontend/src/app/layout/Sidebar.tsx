import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '../../shared/ui/Button'
import { APP_TEXTS, NAV_ITEMS, type NavItemId } from '../constants'
import { SidebarNavItem } from './SidebarNavItem'

export type SidebarProps = {
  activeNavItem: NavItemId
  isOpen: boolean
  onToggle: () => void
  onNewOrchestration: () => void
}

export function Sidebar({ activeNavItem, isOpen, onToggle, onNewOrchestration }: SidebarProps) {
  const navigationTitleId = useId()

  if (!isOpen) {
    return (
      <aside className="flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-100 bg-white py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={APP_TEXTS.showSidebar}
          aria-expanded={false}
          onClick={onToggle}
        >
          <PanelLeftOpen className="size-4.5" aria-hidden="true" />
        </Button>
        <Button size="icon" aria-label={APP_TEXTS.newOrchestration} onClick={onNewOrchestration}>
          <Plus className="size-4.5" aria-hidden="true" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-100 bg-white p-4">
      <div className="mb-8 flex items-center gap-2">
        <Button size="icon" aria-label={APP_TEXTS.newOrchestration} onClick={onNewOrchestration}>
          <Plus className="size-4.5" aria-hidden="true" />
        </Button>
        <span className="text-lg leading-none font-bold whitespace-nowrap text-gray-900">{APP_TEXTS.title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={APP_TEXTS.hideSidebar}
          aria-expanded={true}
          onClick={onToggle}
        >
          <PanelLeftClose className="size-4.5" aria-hidden="true" />
        </Button>
      </div>

      <nav aria-labelledby={navigationTitleId}>
        <p
          id={navigationTitleId}
          className="mb-2 px-3 text-xs font-medium tracking-wide text-gray-400 uppercase"
        >
          {APP_TEXTS.navigation}
        </p>
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.id}
              href={item.href}
              label={item.label}
              isActive={item.id === activeNavItem}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}
