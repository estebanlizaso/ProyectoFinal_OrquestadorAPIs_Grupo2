export const NAVIGATION_EVENT = 'app:navigate'

export type NavigateOptions = {
  /** Reemplaza la entrada actual del historial, así "atrás" no vuelve a una pantalla bloqueada. */
  replace?: boolean
}

export function navigate(path: string, { replace = false }: NavigateOptions = {}): void {
  if (replace) {
    window.history.replaceState(null, '', path)
  } else {
    window.history.pushState(null, '', path)
  }
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}
