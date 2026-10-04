import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'soft'

export type ButtonSize = 'md' | 'sm' | 'icon'

export type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary-blue font-medium text-white hover:bg-primary-blue/90 disabled:opacity-50',
  secondary:
    'border border-gray-200 bg-white font-medium text-primary-blue hover:bg-gray-50 disabled:opacity-50',
  soft: 'border border-primary-blue-light bg-primary-blue-light font-normal text-primary-blue hover:border-primary-blue',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'h-6.5 px-6 text-xs leading-none',
  icon: 'size-8',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  )
}
