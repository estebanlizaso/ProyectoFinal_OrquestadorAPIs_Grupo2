import { SCREEN_NAMES } from './constants'

export type AppRoute =
  | { name: 'projects' }
  | { name: 'projectContext'; projectId: number }
  | { name: 'projectArchitecture'; projectId: number }
  | { name: 'projectGeneration'; projectId: number }

const PROJECT_CONTEXT_PATH_PATTERN = /^\/projects\/(\d+)\/context\/?$/
const PROJECT_ARCHITECTURE_PATH_PATTERN = /^\/projects\/(\d+)\/architecture\/?$/
const PROJECT_GENERATION_PATH_PATTERN = /^\/projects\/(\d+)\/generation\/?$/

export function buildProjectContextPath(projectId: number): string {
  return `/projects/${projectId}/context`
}

export function buildProjectArchitecturePath(projectId: number): string {
  return `/projects/${projectId}/architecture`
}

export function buildProjectGenerationPath(projectId: number): string {
  return `/projects/${projectId}/generation`
}

function parseProjectId(pathname: string, pattern: RegExp): number | null {
  const rawProjectId = pattern.exec(pathname)?.[1]
  if (rawProjectId === undefined) {
    return null
  }
  const projectId = Number(rawProjectId)
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null
}

export function resolveRoute(pathname: string): AppRoute {
  const contextProjectId = parseProjectId(pathname, PROJECT_CONTEXT_PATH_PATTERN)
  if (contextProjectId !== null) {
    return { name: 'projectContext', projectId: contextProjectId }
  }
  const architectureProjectId = parseProjectId(pathname, PROJECT_ARCHITECTURE_PATH_PATTERN)
  if (architectureProjectId !== null) {
    return { name: 'projectArchitecture', projectId: architectureProjectId }
  }
  const generationProjectId = parseProjectId(pathname, PROJECT_GENERATION_PATH_PATTERN)
  if (generationProjectId !== null) {
    return { name: 'projectGeneration', projectId: generationProjectId }
  }
  return { name: 'projects' }
}

export const PROJECTS_PATH = '/'

export type BackTarget = {
  path: string
  screenName: string
}

export function resolveBackTarget(route: AppRoute): BackTarget | null {
  switch (route.name) {
    case 'projects':
      return null
    case 'projectContext':
      return { path: PROJECTS_PATH, screenName: SCREEN_NAMES.projects }
    case 'projectArchitecture':
      return {
        path: buildProjectContextPath(route.projectId),
        screenName: SCREEN_NAMES.projectContext,
      }
    case 'projectGeneration':
      return {
        path: buildProjectArchitecturePath(route.projectId),
        screenName: SCREEN_NAMES.projectArchitecture,
      }
  }
}
