export const GLOBAL_CONTEXT_PAGE_TEXTS = {
  title: 'Contexto global',
  subtitle: 'Explicá el objetivo, la IA completa los datos faltantes.',
  generateArchitecture: 'Generar arquitectura',
  goalTitle: '¿Qué debe lograr esta orquestación?',
  goalEmpty: 'Contale a la IA qué tiene que resolver esta orquestación.',
  generating: 'Generando el contexto...',
  questionsTitle: 'Para completar la arquitectura necesito confirmar:',
  codeTitle: (language: string): string => `Código generado (${language})`,
  errorTitle: 'No se pudo generar el contexto',
}

export const CONTEXT_DETAILS_TEXTS = {
  title: 'Contexto detectado',
  empty: 'Acá vas a ver el resumen y el plan cuando envíes el objetivo.',
  planTitle: 'Plan de la IA',
}

export const PROMPT_COMPOSER_TEXTS = {
  label: 'Objetivo de la orquestación',
  placeholder: 'Escribí tu respuesta...',
  send: 'Enviar',
  sentNotice: 'El contexto ya fue generado. Por ahora no se puede enviar otro mensaje.',
}
