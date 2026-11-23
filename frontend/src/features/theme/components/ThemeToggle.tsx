import { Moon, Sun } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { THEME_TEXTS } from '../constants'
import { useTheme } from '../useTheme'

export type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={THEME_TEXTS.label}
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center justify-between rounded-full border border-gray-200 bg-gray-100 px-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-blue',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 left-0.5 size-5.5 rounded-full bg-surface shadow transition-transform',
          isDark && 'translate-x-7',
        )}
      />
      <Sun className={cn('relative size-4', isDark ? 'text-gray-400' : 'text-amber-500')} aria-hidden="true" />
      <Moon className={cn('relative size-4', isDark ? 'text-primary-blue' : 'text-gray-400')} aria-hidden="true" />
    </button>
  )
}
