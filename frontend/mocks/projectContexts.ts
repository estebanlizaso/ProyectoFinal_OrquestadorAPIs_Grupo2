import type {
  GeneratedCodeResponse,
  OrchestrationNodeResponse,
  OrchestrationRelationResponse,
  PlannerContentResponse,
} from '../src/features/global-context/types.ts'

export const MOCK_GENERATED_CONTENT: GeneratedCodeResponse = {
  status: 'ready',
  language: 'python',
  summary: 'Se generará un script en Python para consumir la API pública de Pokémon y retornar los datos en formato JSON.',
  questions: [],
  plan: [
    'Importar las librerías necesarias como requests.',
    'Crear una función para realizar la petición HTTP GET a la PokeAPI usando un nombre de Pokémon o ID.',
    'Verificar el estado de la respuesta y retornar los datos en formato JSON.',
  ],
  code: null,
}

export const MOCK_PLANNER: PlannerContentResponse = {
  status: 'ready',
  reply: 'Listo, armé un flujo simple: un script en Python consulta la PokeAPI y devuelve los datos del Pokémon en JSON.',
  summary: MOCK_GENERATED_CONTENT.summary,
  questions: [],
  plan: MOCK_GENERATED_CONTENT.plan,
  assumptions: ['Respuestas en formato JSON', 'La PokeAPI es pública y no requiere autenticación'],
  language: 'python',
}

export const MOCK_NODES: OrchestrationNodeResponse[] = [
  {
    id: 1,
    key: 'script-python',
    name: 'Script Python',
    description: 'Pide los datos del Pokémon y los devuelve en JSON.',
    kind: 'system',
    role: 'consumer',
    responsibility: 'Orquestar la consulta.',
    status: 'detected',
    userNotes: null,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 2,
    key: 'pokeapi',
    name: 'PokeAPI',
    description: 'API pública con los datos de cada Pokémon.',
    kind: 'system',
    role: 'provider',
    responsibility: 'Devolver los datos del Pokémon.',
    status: 'detected',
    userNotes: null,
    isActive: true,
    sortOrder: 1,
  },
]

export const MOCK_RELATIONS: OrchestrationRelationResponse[] = [
  {
    id: 1,
    from: 'script-python',
    to: 'pokeapi',
    label: 'consume',
    operation: 'GET /api/v2/pokemon/{nombre}',
    description: 'Consulta de un Pokémon por nombre o ID.',
    kind: 'sync',
    sortOrder: 0,
  },
]
