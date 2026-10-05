import type { ReactNode } from 'react'
import type { NavItemId } from '../constants'
import { Sidebar } from './Sidebar'

export type AppLayoutProps = {
  activeNavItem: NavItemId
  children: ReactNode
}

export function AppLayout({ activeNavItem, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeNavItem={activeNavItem} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
