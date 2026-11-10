import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-blue focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
