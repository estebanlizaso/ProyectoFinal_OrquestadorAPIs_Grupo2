import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { FIRST_PAGE } from '../src/features/projects/constants.ts'
import type {
  CreateProjectRequest,
  DeleteProjectRequest,
  ProjectResponse,
  ProjectsResponse,
} from '../src/features/projects/types.ts'
import { MOCK_PROJECTS } from './projects.ts'

export type ApiMockScenario = 'success' | 'empty' | 'error'

const API_MOCK_SCENARIOS: ApiMockScenario[] = ['success', 'empty', 'error']
const PROJECTS_ROUTE = '/api/projects'
const MOCK_DELAY_MS = 800
const MOCK_TRACE_ID = 'mock-trace-id'
const MOCK_ORIGIN = 'http://localhost'
const MOCK_PAGE_SIZE = 12

const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
  serverError: 500,
}

const MOCK_ERROR_TITLES = {
  invalidRequest: 'Solicitud inválida',
  invalidPage: 'Número de página inválido',
  projectNotFound: 'Proyecto no encontrado',
  validation: 'Una o mas errores de validacion ocurridos.',
}

const MOCK_VALIDATION_MESSAGES = {
  nameRequired: 'El nombre es requerido',
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

function isCreateProjectRequest(value: unknown): value is CreateProjectRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.trim() !== ''
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

function getRequestUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? '/', MOCK_ORIGIN)
}

function getSearchTerm(url: URL): string {
  return url.searchParams.get('search')?.trim() ?? ''
}

function getPage(url: URL): number | null {
  const rawPage = url.searchParams.get('page')
  if (rawPage === null) {
    return FIRST_PAGE
  }
  const page = Number(rawPage)
  return Number.isInteger(page) && page >= FIRST_PAGE ? page : null
}

function buildPageLink(page: number, searchTerm: string): string {
  const params = new URLSearchParams({ page: String(page) })
  if (searchTerm !== '') {
    params.set('search', searchTerm)
  }
  return `${MOCK_ORIGIN}${PROJECTS_ROUTE}?${params.toString()}`
}

function paginateProjects(projects: ProjectResponse[], page: number, searchTerm: string): ProjectsResponse {
  const start = (page - FIRST_PAGE) * MOCK_PAGE_SIZE
  const end = start + MOCK_PAGE_SIZE
  return {
    body: projects.slice(start, end),
    next: projects.length > end ? buildPageLink(page + 1, searchTerm) : null,
    prev: page > FIRST_PAGE ? buildPageLink(page - 1, searchTerm) : null,
  }
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

function getNextProjectId(projects: ProjectResponse[]): number {
  return projects.reduce((maxId, { projectId }) => Math.max(maxId, projectId), 0) + 1
}

function getTodayAsDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

function sendValidationProblem(response: ServerResponse): void {
  sendJson(response, HTTP_STATUS.badRequest, {
    type: 'about:blank',
    title: MOCK_ERROR_TITLES.validation,
    status: HTTP_STATUS.badRequest,
    traceId: MOCK_TRACE_ID,
    errors: { Name: [MOCK_VALIDATION_MESSAGES.nameRequired] },
  })
}


function sendProjects(
  response: ServerResponse,
  scenario: ApiMockScenario,
  projects: ProjectResponse[],
  url: URL,
): void {
  if (scenario === 'error') {
    sendServerError(response)
    return
  }
  const page = getPage(url)
  if (page === null) {
    sendProblem(response, HTTP_STATUS.badRequest, MOCK_ERROR_TITLES.invalidPage)
    return
  }
  const searchTerm = getSearchTerm(url)
  sendJson(response, HTTP_STATUS.ok, paginateProjects(filterProjects(projects, searchTerm), page, searchTerm))
}

async function sendCreateResult(
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
  if (!isCreateProjectRequest(payload)) {
    sendValidationProblem(response)
    return
  }
  const project: ProjectResponse = {
    name: payload.name.trim(),
    description: null,
    projectId: getNextProjectId(projects),
    created_at: getTodayAsDateOnly(),
  }
  projects.unshift(project)
  sendJson(response, HTTP_STATUS.created, project)
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
          const url = getRequestUrl(request)
          setTimeout(() => sendProjects(response, scenario, projects, url), MOCK_DELAY_MS)
          return
        }

                if (request.method === 'POST') {
          void sendCreateResult(request, response, scenario, projects)
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