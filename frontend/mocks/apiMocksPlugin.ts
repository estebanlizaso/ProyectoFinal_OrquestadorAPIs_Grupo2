import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { DeleteProjectRequest, ProjectResponse, ProjectsResponse } from '../src/features/projects/types.ts'
import { MOCK_PROJECTS } from './projects.ts'

export type ApiMockScenario = 'success' | 'empty' | 'error'

const API_MOCK_SCENARIOS: ApiMockScenario[] = ['success', 'empty', 'error']
const PROJECTS_ROUTE = '/api/projects'
const MOCK_DELAY_MS = 800
const MOCK_TRACE_ID = 'mock-trace-id'
const MOCK_ORIGIN = 'http://localhost'

const HTTP_STATUS = {
  ok: 200,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
  serverError: 500,
}

const MOCK_ERROR_TITLES = {
  invalidRequest: 'Solicitud inválida',
  projectNotFound: 'Proyecto no encontrado',
}

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

function isDeleteProjectRequest(value: unknown): value is DeleteProjectRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'projectId' in value &&
    typeof value.projectId === 'number'
  )
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('error', reject)
    request.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (text === '') {
        resolve(undefined)
        return
      }
      try {
        const data: unknown = JSON.parse(text)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    })
  })
}

function getSearchTerm(request: IncomingMessage): string {
  const url = new URL(request.url ?? '/', MOCK_ORIGIN)
  return url.searchParams.get('search')?.trim() ?? ''
}

function filterProjects(projects: ProjectResponse[], searchTerm: string): ProjectResponse[] {
  if (searchTerm === '') {
    return projects
  }
  const normalizedTerm = searchTerm.toLowerCase()
  return projects.filter(({ name }) => name.toLowerCase().includes(normalizedTerm))
}

function sendJson(response: ServerResponse, status: number, data: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(data))
}

function sendProblem(response: ServerResponse, status: number, title: string): void {
  sendJson(response, status, { type: 'about:blank', title, status, traceId: MOCK_TRACE_ID })
}

function sendServerError(response: ServerResponse): void {
  response.statusCode = HTTP_STATUS.serverError
  response.end()
}

function sendProjects(response: ServerResponse, scenario: ApiMockScenario, projects: ProjectResponse[]): void {
  if (scenario === 'error') {
    sendServerError(response)
    return
  }
  const payload: ProjectsResponse = { body: projects }
  sendJson(response, HTTP_STATUS.ok, payload)
}

async function sendDeleteResult(
  request: IncomingMessage,
  response: ServerResponse,
  scenario: ApiMockScenario,
  projects: ProjectResponse[],
): Promise<void> {
  const payload = await readJsonBody(request).catch(() => undefined)
  await wait(MOCK_DELAY_MS)

  if (scenario === 'error') {
    sendServerError(response)
    return
  }
  if (!isDeleteProjectRequest(payload)) {
    sendProblem(response, HTTP_STATUS.badRequest, MOCK_ERROR_TITLES.invalidRequest)
    return
  }
  const index = projects.findIndex(({ projectId }) => projectId === payload.projectId)
  if (index === -1) {
    sendProblem(response, HTTP_STATUS.notFound, MOCK_ERROR_TITLES.projectNotFound)
    return
  }
  projects.splice(index, 1)
  response.statusCode = HTTP_STATUS.noContent
  response.end()
}

export function apiMocksPlugin(scenario: ApiMockScenario): Plugin {
  const projects: ProjectResponse[] = scenario === 'success' ? [...MOCK_PROJECTS] : []

  return {
    name: 'api-mocks',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(PROJECTS_ROUTE, (request, response, next) => {
        if (request.method === 'GET') {
          const searchTerm = getSearchTerm(request)
          setTimeout(
            () => sendProjects(response, scenario, filterProjects(projects, searchTerm)),
            MOCK_DELAY_MS,
          )
          return
        }
        if (request.method === 'DELETE') {
          void sendDeleteResult(request, response, scenario, projects)
          return
        }
        next()
      })
    },
  }
}