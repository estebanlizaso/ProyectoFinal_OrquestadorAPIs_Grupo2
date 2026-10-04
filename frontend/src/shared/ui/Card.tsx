import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export type CardProps = ComponentPropsWithoutRef<'div'>

export function Card({ className, ...props }: CardProps) {
  return <div className={cn('rounded-xl border border-gray-100 bg-white p-4', className)} {...props} />
}
