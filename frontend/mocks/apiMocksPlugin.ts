import type { ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { ProjectsResponse } from '../src/features/projects/types.ts'
import { MOCK_PROJECTS } from './projects.ts'

export type ApiMockScenario = 'success' | 'empty' | 'error'

const API_MOCK_SCENARIOS: ApiMockScenario[] = ['success', 'empty', 'error']
const PROJECTS_ROUTE = '/api/projects'
const MOCK_DELAY_MS = 800

function isApiMockScenario(value: string): value is ApiMockScenario {
  return API_MOCK_SCENARIOS.some((scenario) => scenario === value)
}

export function resolveApiMockScenario(value: string | undefined): ApiMockScenario | null {
  if (!value) {
    return null
  }
  if (!isApiMockScenario(value)) {
    throw new Error(`API_MOCKS debe ser uno de: ${API_MOCK_SCENARIOS.join(', ')}`)
  }
  return value
}

function sendJson(response: ServerResponse, status: number, data: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(data))
}

function sendProjects(response: ServerResponse, scenario: ApiMockScenario): void {
  if (scenario === 'error') {
    response.statusCode = 500
    response.end()
    return
  }
  const projects: ProjectsResponse = { body: scenario === 'success' ? MOCK_PROJECTS : [] }
  sendJson(response, 200, projects)
}

export function apiMocksPlugin(scenario: ApiMockScenario): Plugin {
  return {
    name: 'api-mocks',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(PROJECTS_ROUTE, (request, response, next) => {
        if (request.method !== 'GET') {
          next()
          return
        }
        setTimeout(() => sendProjects(response, scenario), MOCK_DELAY_MS)
      })
    },
  }
}
