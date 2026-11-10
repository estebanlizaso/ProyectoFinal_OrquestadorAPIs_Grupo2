export const NAVIGATION_EVENT = 'app:navigate'

export function navigate(path: string): void {
  window.history.pushState(null, '', path)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}
