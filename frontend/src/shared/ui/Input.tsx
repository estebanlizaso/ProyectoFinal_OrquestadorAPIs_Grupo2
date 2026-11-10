import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export type InputProps = ComponentPropsWithoutRef<'input'>

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-blue focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}