import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Card } from './Card'

export type StatusMessageTone = 'neutral' | 'error'

export type StatusMessageProps = {
  icon: LucideIcon
  title: string
  description?: string
  tone?: StatusMessageTone
  action?: ReactNode
}

const ICON_TONE_CLASSES: Record<StatusMessageTone, string> = {
  neutral: 'text-gray-400',
  error: 'text-red-500',
}

export function StatusMessage({ icon: Icon, title, description, tone = 'neutral', action }: StatusMessageProps) {
  return (
    <Card
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex flex-col items-center gap-2 py-10 text-center"
    >
      <Icon aria-hidden="true" className={cn('size-8', ICON_TONE_CLASSES[tone])} />
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}
