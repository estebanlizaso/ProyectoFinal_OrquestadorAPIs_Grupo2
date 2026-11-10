export const APP_TEXTS = {
  title: 'Orquestador IA',
  navigation: 'Navegación',
  newOrchestration: 'Nueva orquestación',
  hideSidebar: 'Ocultar menú',
  showSidebar: 'Mostrar menú',
  backTo: 'Volver a ',
}

export const SCREEN_NAMES = {
  projects: 'proyectos',
  projectContext: 'contexto global',
  projectArchitecture: 'arquitectura propuesta',
}

export type NavItemId = 'projects'

export type NavItem = {
  id: NavItemId
  href: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [{ id: 'projects', href: '/', label: 'Proyectos' }]
