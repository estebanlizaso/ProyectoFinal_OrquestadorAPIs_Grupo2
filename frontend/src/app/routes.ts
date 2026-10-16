export type AppRoute = { name: 'projects' } | { name: 'projectContext'; projectId: number }

const PROJECT_CONTEXT_PATH_PATTERN = /^\/projects\/(\d+)\/context\/?$/

export function buildProjectContextPath(projectId: number): string {
  return `/projects/${projectId}/context`
}

export function resolveRoute(pathname: string): AppRoute {
  const rawProjectId = PROJECT_CONTEXT_PATH_PATTERN.exec(pathname)?.[1]
  if (rawProjectId !== undefined) {
    const projectId = Number(rawProjectId)
    if (Number.isSafeInteger(projectId) && projectId > 0) {
      return { name: 'projectContext', projectId }
    }
  }
  return { name: 'projects' }
}