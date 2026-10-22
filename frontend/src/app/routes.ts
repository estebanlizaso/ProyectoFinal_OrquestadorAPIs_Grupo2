export type AppRoute =
  | { name: 'projects' }
  | { name: 'projectContext'; projectId: number }
  | { name: 'projectArchitecture'; projectId: number }

const PROJECT_CONTEXT_PATH_PATTERN = /^\/projects\/(\d+)\/context\/?$/
const PROJECT_ARCHITECTURE_PATH_PATTERN = /^\/projects\/(\d+)\/architecture\/?$/

export function buildProjectContextPath(projectId: number): string {
  return `/projects/${projectId}/context`
}

export function buildProjectArchitecturePath(projectId: number): string {
  return `/projects/${projectId}/architecture`
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
  return { name: 'projects' }
}
