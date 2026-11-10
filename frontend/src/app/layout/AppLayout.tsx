import type { ReactNode } from 'react'
import type { NavItemId } from '../constants'
import { Sidebar } from './Sidebar'

export type AppLayoutProps = {
  activeNavItem: NavItemId
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  onNewOrchestration: () => void
  children: ReactNode
}

export function AppLayout({
  activeNavItem,
  isSidebarOpen,
  onToggleSidebar,
  onNewOrchestration,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeNavItem={activeNavItem}
        isOpen={isSidebarOpen}
        onToggle={onToggleSidebar}
        onNewOrchestration={onNewOrchestration}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
