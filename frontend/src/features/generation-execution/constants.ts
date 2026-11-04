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

export const GENERATION_DURATION_MS = 8000

export const PROGRESS_TICK_MS = 100

export const PROGRESS_COMPLETE = 100
