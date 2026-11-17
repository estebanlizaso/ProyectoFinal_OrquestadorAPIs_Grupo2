export const PROJECT_CARD_TEXTS = {
  openFlow: 'Abrir flujo',
  actionsMenu: 'Acciones del proyecto',
  createdAt: 'Creado el',
  noDescription: 'Sin descripción',
  deleteAction: 'Eliminar',
  downloadContextAction: 'Descargar contexto del proyecto',
  downloadingContext: 'Preparando contexto...',
}

export function buildProjectContextFileName(projectId: number): string {
  return `contexto-proyecto-${projectId}.md`
}

export const MARKDOWN_MIME_TYPE = 'text/markdown;charset=utf-8'

export const PROJECT_CONTEXT_EXPORT_TEXTS = {
  title: (name: string): string => `Contexto del proyecto: ${name}`,
  initialPrompt: 'Prompt inicial',
  conversation: 'Conversación',
  noMessages: 'Sin mensajes.',
  message: (position: number): string => `Mensaje ${position}`,
  user: 'Usuario',
  ai: 'IA',
  flowSummary: 'Resumen del flujo',
  plan: 'Plan',
  assumptions: 'Suposiciones',
  language: 'Lenguaje',
  modules: 'Módulos',
  relations: 'Relaciones',
  noMap: 'El mapa no está disponible en este navegador. Se guarda en el navegador donde se charló con la IA.',
  noRelations: 'Sin relaciones.',
  kind: 'Tipo',
  description: 'Descripción',
  role: 'Rol',
  responsibility: 'Responsabilidad',
  notes: 'Notas',
}

export const PROJECTS_PAGE_TEXTS = {
  title: 'Proyectos',
  subtitle: 'Gestioná tus orquestaciones y comenzá un nuevo flujo.',
  newOrchestration: 'Nueva orquestación',
  recent: 'Recientes',
  loading: 'Cargando proyectos',
  errorTitle: 'No se pudieron cargar los proyectos',
  retry: 'Reintentar',
  emptyTitle: 'Todavía no hay proyectos',
  emptyDescription: 'Creá una nueva orquestación para empezar.',
}

export const SKELETON_CARD_COUNT = 3

export const PROJECT_DELETE_TEXTS = {
  title: 'Eliminar proyecto',
  description: (name: string): string => `Vas a eliminar "${name}". Esta acción no se puede deshacer.`,
  cancel: 'Cancelar',
  confirm: 'Eliminar',
  deleting: 'Eliminando...',
  errorTitle: 'No se pudo eliminar el proyecto',
}

export const SEARCH_DEBOUNCE_MS = 300

export const FIRST_PAGE = 1

export const PROJECT_PAGINATION_TEXTS = {
  label: 'Paginación de proyectos',
  previous: 'Anterior',
  next: 'Siguiente',
  currentPage: (page: number): string => `Página ${page}`,
}

export const PROJECT_SEARCH_TEXTS = {
  label: 'Buscar proyectos',
  placeholder: 'Buscar por nombre',
  clear: 'Limpiar búsqueda',
  noResultsTitle: 'No hay resultados',
  noResultsDescription: (term: string): string => `No encontramos proyectos que coincidan con "${term}".`,
}

export const PROJECT_CREATE_TEXTS = {
  title: 'Nueva orquestación',
  description: 'Ponele un nombre a tu orquestación. Después vas a definir su contexto.',
  nameLabel: 'Nombre',
  namePlaceholder: 'Ej: Orquestador de pagos',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  creating: 'Creando...',
  errorTitle: 'No se pudo crear el proyecto',
}
