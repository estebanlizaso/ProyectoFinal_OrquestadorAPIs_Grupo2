export const PROJECT_CARD_TEXTS = {
  openFlow: 'Abrir flujo',
  actionsMenu: 'Acciones del proyecto',
  createdAt: 'Creado el',
  noDescription: 'Sin descripción',
  deleteAction: 'Eliminar',
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

export const PROJECT_SEARCH_TEXTS = {
  label: 'Buscar proyectos',
  placeholder: 'Buscar por nombre',
  clear: 'Limpiar búsqueda',
  noResultsTitle: 'No hay resultados',
  noResultsDescription: (term: string): string => `No encontramos proyectos que coincidan con "${term}".`,
}