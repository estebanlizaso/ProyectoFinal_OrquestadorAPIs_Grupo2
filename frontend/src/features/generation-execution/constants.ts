export const GENERATION_PAGE_TEXTS = {
  title: 'Generación y ejecución',
  subtitle: 'Cada tarjeta tiene un agente dedicado que genera su código.',
}

export const GENERATION_PROGRESS_TEXTS = {
  title: 'Progreso de generación',
  progressLabel: 'Progreso de la generación',
  generatingSolution: 'Generando solución',
  solutionGeneratedPrefix: 'Solución',
  solutionGeneratedSuffix: 'generada',
  completed: 'Generación completa',
  openingResults: 'Abriendo resultados...',
  retry: 'Reintentar',
  missingAiSelection: 'No hay un modelo de IA elegido. Elegilo en el chat de Arquitectura propuesta.',
  invalidTimeout: 'La configuración del tiempo de espera no es válida. Revisá VITE_AI_CONTEXT_TIMEOUT_MS.',
}

export const GENERATION_STAGES = [
  'Analizando contratos y modelos',
  'Generando clientes HTTP',
  'Generando adaptadores y composición',
  'Armando la solución',
]

export const SOLUTION_LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python',
  dotnet: 'C# / .NET',
}

export const PROGRESS_WAITING_CAP = 90

export const PROGRESS_TIME_CONSTANT_MS = 30_000

export const RESULTS_FADE_OUT_DELAY_MS = 900

export const RESULTS_TRANSITION_DELAY_MS = 1200

export const PROGRESS_TICK_MS = 100

export const PROGRESS_COMPLETE = 100
