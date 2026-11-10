import type { ReactNode } from 'react'
import { Card } from './Card'

export type SidePanelProps = {
  title: string
  children: ReactNode
}

export function SidePanel({ title, children }: SidePanelProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg leading-none font-bold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  )
}
