export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

const DARK_CLASS = 'dark'
const listeners = new Set<() => void>()

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS) ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento, la elección solo dura la sesión.
  }
  listeners.forEach((listener) => listener())
}

export function initTheme(): void {
  document.documentElement.classList.toggle(DARK_CLASS, readStoredTheme() === 'dark')
}

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}
