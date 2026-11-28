export const RESULTS_PAGE_TEXTS = {
  title: 'Resultados',
  subtitle: 'La orquestación está lista para revisar y descargar.',
}

export const RESULTS_ACTIONS_TEXTS = {
  backToProjects: 'Volver a Proyectos',
  downloadPostman: 'Descargar colección Postman',
  downloadingPostman: 'Descargando colección...',
  downloadZip: 'Descargar flujo completo .ZIP',
  downloadingZip: 'Descargando ZIP...',
}

export const ARTIFACT_FILE_NAMES = {
  package: (projectId: number): string => `flujo-proyecto-${projectId}.zip`,
  postmanCollection: (projectId: number): string => `coleccion-postman-proyecto-${projectId}.json`,
}
