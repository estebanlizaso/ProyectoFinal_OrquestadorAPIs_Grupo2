import type { ReactNode } from 'react'

export type PageHeaderProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-none font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {actions}
    </header>
  )
}
