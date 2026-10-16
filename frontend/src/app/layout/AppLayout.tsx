import type { ReactNode } from 'react'
import type { NavItemId } from '../constants'
import { Sidebar } from './Sidebar'

export type AppLayoutProps = {
  activeNavItem: NavItemId
  onNewOrchestration: () => void
  children: ReactNode
}

export function AppLayout({ activeNavItem, onNewOrchestration, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeNavItem={activeNavItem} onNewOrchestration={onNewOrchestration} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}