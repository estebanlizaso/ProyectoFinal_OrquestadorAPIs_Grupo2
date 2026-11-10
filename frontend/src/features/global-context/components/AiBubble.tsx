import type { ReactNode } from 'react'

export type AiBubbleProps = {
  children: ReactNode
}

export function AiBubble({ children }: AiBubbleProps) {
  return (
    <div className="w-fit rounded-lg bg-gray-100 px-4 py-3 text-sm whitespace-pre-wrap text-gray-900">{children}</div>
  )
}
