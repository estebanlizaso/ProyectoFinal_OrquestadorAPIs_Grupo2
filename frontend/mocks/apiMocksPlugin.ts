import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type {
  CreateProjectContextRequest,
  InitialProjectPromptResponse,
  ProjectContextResponse,
} from '../src/features/global-context/types.ts'
import { FIRST_PAGE } from '../src/features/projects/constants.ts'
import type {
  CreateProjectRequest,
  DeleteProjectRequest,
  ProjectResponse,
  ProjectsResponse,
} from '../src/features/projects/types.ts'
import { MOCK_INITIAL_PROMPTS } from './initialPrompts.ts'
import { MOCK_GENERATED_CONTENT } from './projectContexts.ts'
import { MOCK_PROJECTS } from './projects.ts'

export type ApiMockScenario = 'success' | 'empty' | 'error'

const API_MOCK_SCENARIOS: ApiMockScenario[] = ['success', 'empty', 'error']
const PROJECTS_ROUTE = '/api/projects'
const PROJECTS_ROOT_PATH = '/'
const PROJECT_CONTEXT_PATH_PATTERN = /^\/(\d+)\/context\/?$/
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
  promptNotFound: 'Prompt inicial no encontrado',
  validation: 'One or more validation errors occurred.',
}

const MOCK_VALIDATION_ERRORS = {
  nameRequired: { Name: ['The Name field is required.'] },
  promptRequired: { Prompt: ['The Prompt field is required.'] },
}

type ValidationErrors = Record<string, string[]>

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

function isCreateProjectContextRequest(value: unknown): value is CreateProjectContextRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'prompt' in value &&
    typeof value.prompt === 'string' &&
    value.prompt.trim() !== ''
  )
}

function getContextProjectId(pathname: string): number | null {
  const rawProjectId = PROJECT_CONTEXT_PATH_PATTERN.exec(pathname)?.[1]
  return rawProjectId === undefined ? null : Number(rawProjectId)
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

function sendValidationProblem(response: ServerResponse, errors: ValidationErrors): void {
  sendJson(response, HTTP_STATUS.badRequest, {
    type: 'about:blank',
    title: MOCK_ERROR_TITLES.validation,
    status: HTTP_STATUS.badRequest,
    traceId: MOCK_TRACE_ID,
    errors,
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
    sendValidationProblem(response, MOCK_VALIDATION_ERRORS.nameRequired)
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

function buildSeedContexts(): Map<number, ProjectContextResponse> {
  const contexts = new Map<number, ProjectContextResponse>()
  Object.entries(MOCK_INITIAL_PROMPTS).forEach(([rawProjectId, initialPrompt], index) => {
    const projectId = Number(rawProjectId)
    contexts.set(projectId, {
      contextId: index + 1,
      projectId,
      initialPrompt,
      generatedContent: MOCK_GENERATED_CONTENT,
      resumen: null,
      updatedAt: null,
    })
  })
  return contexts
}

async function sendInitialPromptResult(
  response: ServerResponse,
  scenario: ApiMockScenario,
  contexts: Map<number, ProjectContextResponse>,
  projectId: number,
): Promise<void> {
  await wait(MOCK_DELAY_MS)

  if (scenario === 'error') {
    sendServerError(response)
    return
  }
  const context = contexts.get(projectId)
  if (!context) {
    sendProblem(response, HTTP_STATUS.notFound, MOCK_ERROR_TITLES.promptNotFound)
    return
  }
  const payload: InitialProjectPromptResponse = { initialPrompt: context.initialPrompt }
  sendJson(response, HTTP_STATUS.ok, payload)
}

async function sendCreateContextResult(
  request: IncomingMessage,
  response: ServerResponse,
  scenario: ApiMockScenario,
  projects: ProjectResponse[],
  contexts: Map<number, ProjectContextResponse>,
  projectId: number,
): Promise<void> {
  const payload = await readJsonBody(request).catch(() => undefined)
  await wait(MOCK_DELAY_MS)

  if (scenario === 'error') {
    sendServerError(response)
    return
  }
  if (!isCreateProjectContextRequest(payload)) {
    sendValidationProblem(response, MOCK_VALIDATION_ERRORS.promptRequired)
    return
  }
  if (!projects.some((project) => project.projectId === projectId)) {
    sendProblem(response, HTTP_STATUS.notFound, MOCK_ERROR_TITLES.projectNotFound)
    return
  }
  const existingContext = contexts.get(projectId)
  if (existingContext) {
    sendJson(response, HTTP_STATUS.ok, existingContext)
    return
  }
  const context: ProjectContextResponse = {
    contextId: contexts.size + 1,
    projectId,
    initialPrompt: payload.prompt.trim(),
    generatedContent: MOCK_GENERATED_CONTENT,
    resumen: null,
    updatedAt: new Date().toISOString(),
  }
  contexts.set(projectId, context)
  sendJson(response, HTTP_STATUS.created, context)
}

export function apiMocksPlugin(scenario: ApiMockScenario): Plugin {
  const projects: ProjectResponse[] = scenario === 'success' ? [...MOCK_PROJECTS] : []
  const contexts =
    scenario === 'success' ? buildSeedContexts() : new Map<number, ProjectContextResponse>()

  return {
    name: 'api-mocks',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(PROJECTS_ROUTE, (request, response, next) => {
        const url = getRequestUrl(request)
        const contextProjectId = getContextProjectId(url.pathname)

        if (contextProjectId !== null && request.method === 'POST') {
          void sendCreateContextResult(request, response, scenario, projects, contexts, contextProjectId)
          return
        }
        if (contextProjectId !== null && request.method === 'GET') {
          void sendInitialPromptResult(response, scenario, contexts, contextProjectId)
          return
        }
        if (url.pathname !== PROJECTS_ROOT_PATH) {
          next()
          return
        }
        if (request.method === 'GET') {
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