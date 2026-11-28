import { useSyncExternalStore } from 'react'
import { getTheme, setTheme, subscribeToTheme, type Theme } from './theme'

export type UseThemeResult = {
  theme: Theme
  toggleTheme: () => void
}

export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme)

  return {
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  }
}
