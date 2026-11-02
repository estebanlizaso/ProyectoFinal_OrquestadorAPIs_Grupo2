export type AppRoute =
  | { name: 'projects' }
  | { name: 'projectArchitecture'; projectId: number }

const PROJECT_ARCHITECTURE_PATH_PATTERN = /^\/projects\/(\d+)\/architecture\/?$/

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
  const architectureProjectId = parseProjectId(pathname, PROJECT_ARCHITECTURE_PATH_PATTERN)
  if (architectureProjectId !== null) {
    return { name: 'projectArchitecture', projectId: architectureProjectId }
  }
  return { name: 'projects' }
}
