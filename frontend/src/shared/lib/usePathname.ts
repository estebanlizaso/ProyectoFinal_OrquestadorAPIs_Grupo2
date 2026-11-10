import { useSyncExternalStore } from 'react'
import { NAVIGATION_EVENT } from './navigate'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATION_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATION_EVENT, onChange)
  }
}

function getSnapshot(): string {
  return window.location.pathname
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getSnapshot)
}