export const PROPOSED_ARCHITECTURE_PAGE_TEXTS = {
  title: 'Arquitectura propuesta',
  subtitle: 'Revisá y ajustá lo que sea necesario en el diagrama.',
  confirmFlow: 'Confirmar flujo',
  diagramEmpty: 'Todavía no hay un diagrama para mostrar.',
}

export const DIAGRAM_TEXTS = {
  start: 'Inicio',
}

export const AI_ASSISTANT_TEXTS = {
  title: 'Asistente IA',
  flowSummaryTitle: 'Resumen del flujo',
  flowSummaryEmpty: 'Todavía no hay un resumen para mostrar.',
  temporalRuleTitle: 'Regla temporal',
  proposedEndpointsTitle: 'Endpoints propuestos',
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

export const RULE_MIN_LENGTH = 10

export const MODULE_DETAIL_TEXTS = {
  titlePrefix: 'Detalle del módulo: ',
  subtitle: 'Configurá el comportamiento particular de la tarjeta seleccionada.',
  close: 'Cerrar',
  behaviorTag: 'Comportamiento',
  ruleTitle: 'Regla en lenguaje natural',
  rulePlaceholder: 'Consultar ambos cores en paralelo para el historial.',
  endpointTitle: 'Configuración del endpoint',
  methodLabel: 'Método',
  methodPlaceholder: 'GET',
  routeLabel: 'Ruta',
  routePlaceholder: '/clientes/{id}/historial-polizas',
  authenticationLabel: 'Autenticación',
  authenticationPlaceholder: 'Seleccioná una opción',
  specificationTitle: 'Swagger, OpenAPI o API legacy',
  importTitle: 'Importar especificación',
  importDescription: 'Analizamos contratos y modelos.',
  selectFile: 'Seleccionar archivo',
  cancel: 'Cancelar',
  saveRule: 'Guardar regla',
  savingRule: 'Guardando regla...',
  saveErrorTitle: 'No se pudo guardar la regla',
  ruleUpdatedPromptPrefix: 'Actualicé la regla de ',
  ruleUpdatedPromptSeparator: ', ahora: ',
  ruleMinLengthHint: `Mínimo ${RULE_MIN_LENGTH} caracteres.`,
  endpointIncomplete: 'Completá el método y la ruta.',
}

export const RULE_MAX_LENGTH = 2000

export const MODULE_NOTE_PREFIXES = {
  rule: 'Regla: ',
  endpoint: 'Endpoint: ',
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
