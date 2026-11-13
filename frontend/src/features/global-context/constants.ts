export const GLOBAL_CONTEXT_PAGE_TEXTS = {
  title: 'Contexto global',
  subtitle: 'Explicá el objetivo, la IA completa los datos faltantes.',
  generateFlow: 'Generar Flujo',
}

export const CONTEXT_DETAILS_TEXTS = {
  title: 'Contexto detectado',
  empty: 'Acá vas a ver los sistemas detectados cuando envíes el objetivo.',
  assumptionsTitle: 'Suposiciones de la IA',
}

export const CONTEXT_CHAT_TEXTS = {
  title: '¿Qué debe lograr esta orquestación?',
  goalEmpty: 'Contale a la IA qué tiene que resolver esta orquestación.',
  errorTitle: 'No se pudo generar el contexto',
  rejectedTitle: 'La IA no puede ayudarte con esto',
  historyLoading: 'Cargando conversación…',
  historyError: 'No se pudo cargar la conversación.',
  historyRetry: 'Reintentar',
}

export const PROMPT_COMPOSER_TEXTS = {
  label: 'Objetivo de la orquestación',
  placeholder: 'Escribí tu respuesta...',
  send: 'Enviar',
}

export const PROMPT_EXAMPLE_TEXTS = {
  button: 'Ejemplo',
  buttonLabel: 'Ver un ejemplo de pedido',
  title: 'Ejemplo de pedido',
  example:
    'Quiero orquestar la consulta de pólizas de un cliente. El portal web llama al orquestador, que consulta el Core Legacy (SOAP) y Pólizas 360 (REST). Generá el código en C#. Reglas: si el Core Legacy tarda más de 3 segundos, usar solo Pólizas 360; no mostrar pólizas vencidas. Respuesta esperada: un JSON con la lista de pólizas activas y su estado.',
  use: 'Usar',
}

export const TYPEWRITER_CHAR_INTERVAL_MS = 15
