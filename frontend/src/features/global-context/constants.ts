export const CONTEXT_CHAT_TEXTS = {
  title: '¿Qué debe lograr esta orquestación?',
  goalEmpty: 'Contale a la IA qué tiene que resolver esta orquestación.',
  errorTitle: 'No se pudo generar el contexto',
  rejectedTitle: 'La IA no puede ayudarte con esto',
}

export const PROMPT_COMPOSER_TEXTS = {
  label: 'Objetivo de la orquestación',
  placeholder: 'Escribí tu respuesta...',
  examplePlaceholder:
    'Ej: Quiero orquestar la consulta de pólizas de un cliente. El portal web llama al orquestador, que consulta el Core Legacy (SOAP) y Pólizas 360 (REST). Generá el código en C#. Reglas: si el Core Legacy tarda más de 3 segundos, usar solo Pólizas 360; no mostrar pólizas vencidas. Respuesta esperada: un JSON con la lista de pólizas activas y su estado.',
  send: 'Enviar',
}

export const TYPEWRITER_CHAR_INTERVAL_MS = 15
