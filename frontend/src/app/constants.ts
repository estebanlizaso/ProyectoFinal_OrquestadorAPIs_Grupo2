export const APP_TEXTS = {
  title: 'Orquestador IA',
  navigation: 'Navegación',
  newOrchestration: 'Nueva orquestación',
  projectContext: 'Contexto global',
  projectContextPending: (projectId: number): string =>
    `Proyecto #${projectId}. Esta pantalla se reemplaza por la de contexto global.`,
}

export type NavItemId = 'projects'

export type NavItem = {
  id: NavItemId
  href: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [{ id: 'projects', href: '/', label: 'Proyectos' }]