import { Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '../../shared/ui/Button'
import { APP_TEXTS, NAV_ITEMS, type NavItemId } from '../constants'
import { SidebarNavItem } from './SidebarNavItem'

export type SidebarProps = {
  activeNavItem: NavItemId
}

export function Sidebar({ activeNavItem }: SidebarProps) {
  const navigationTitleId = useId()

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-white p-4">
      <div className="mb-8 flex items-center gap-2">
        <Button size="icon" aria-label={APP_TEXTS.newOrchestration}>
          <Plus className="size-4.5" aria-hidden="true" />
        </Button>
        <span className="text-lg leading-none font-bold text-gray-900">{APP_TEXTS.title}</span>
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
