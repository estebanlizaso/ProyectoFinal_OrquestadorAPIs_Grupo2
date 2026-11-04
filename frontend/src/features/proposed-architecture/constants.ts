export const PROPOSED_ARCHITECTURE_PAGE_TEXTS = {
  title: 'Arquitectura propuesta',
  subtitle: 'Revisá y ajustá lo que sea necesario en el diagrama.',
  confirmFlow: 'Confirmar flujo',
  diagramEmpty: 'Todavía no hay un diagrama para mostrar.',
}

export const DIAGRAM_TEXTS = {
  start: 'Inicio',
  decision: 'Solicitud',
}

export const FLOW_SUMMARY_TEXTS = {
  title: 'Resumen',
  flowSummaryTitle: 'Resumen del flujo',
  flowSummaryEmpty: 'Todavía no hay un resumen para mostrar.',
  proposedEndpointsTitle: 'Endpoints propuestos',
  proposedEndpointsEmpty: 'Todavía no hay endpoints propuestos.',
}

export const ASSISTANT_PANEL_TABS_TEXTS = {
  label: 'Panel del asistente',
  chat: 'Asistente IA',
  summary: 'Resumen',
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export const AUTHENTICATION_TYPES = [
  'Ninguna',
  'API key',
  'Basic',
  'Bearer token',
  'OAuth 2.0',
  'Certificado (mTLS)',
] as const

export const MODULE_DETAIL_TEXTS = {
  titlePrefix: 'Detalle del módulo: ',
  subtitle: 'Configurá el comportamiento particular de la tarjeta seleccionada.',
  close: 'Cerrar',
  behaviorTag: 'Comportamiento',
  descriptionTitle: 'Descripción',
  descriptionEmpty: 'Sin descripción.',
  endpointTitle: 'Configuración del endpoint',
  methodLabel: 'Método',
  methodPlaceholder: 'GET',
  routeLabel: 'Ruta',
  routePlaceholder: '/clientes/{id}/historial-polizas',
  authenticationLabel: 'Autenticación',
  authenticationPlaceholder: 'Seleccioná una opción',
  cancel: 'Cancelar',
  save: 'Guardar',
  saving: 'Guardando...',
  saveErrorTitle: 'No se pudo guardar la configuración',
  endpointIncomplete: 'Completá el método y la ruta.',
  endpointSourcePrefix: 'Desde ',
}

export const MODULE_NOTE_PREFIXES = {
  endpoint: 'Endpoint: ',
  endpointFrom: 'Endpoint desde ',
  endpointSourceSeparator: ': ',
  authentication: 'Autenticación: ',
}

export const ROUTE_ERROR_TEXTS = {
  missingLeadingSlash: 'La ruta tiene que empezar con /.',
  hasSpaces: 'La ruta no puede tener espacios.',
  hasQuery: 'La ruta no puede tener parámetros de consulta (?).',
  hasDoubleSlash: 'La ruta no puede tener dos / seguidas.',
  invalidParameter: 'Los parámetros van entre llaves y con nombre, por ejemplo {id}.',
  invalidCharacters: 'Usá solo letras sin tilde, números, -, _, . y /.',
}
