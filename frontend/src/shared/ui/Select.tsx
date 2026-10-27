import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export type SelectProps = ComponentPropsWithoutRef<'select'>

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-blue focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
