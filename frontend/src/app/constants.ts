export const APP_TEXTS = {
  title: 'Orquestador IA',
  navigation: 'Navegación',
  newOrchestration: 'Nueva orquestación',
}

export type NavItemId = 'projects'

export type NavItem = {
  id: NavItemId
  href: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [{ id: 'projects', href: '/', label: 'Proyectos' }]
