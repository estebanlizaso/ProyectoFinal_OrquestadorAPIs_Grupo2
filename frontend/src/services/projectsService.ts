import type { DeleteProjectRequest, ProjectResponse, ProjectsResponse } from '../features/projects'
import { deleteJson, getJson, type RequestOptions } from '../shared/api/httpClient'

const PROJECTS_PATH = '/projects'

export async function getProjects(options?: RequestOptions): Promise<ProjectResponse[]> {
  const { body } = await getJson<ProjectsResponse>(PROJECTS_PATH, options)
  return body
}

export async function deleteProject(
  projectId: ProjectResponse['projectId'],
  options?: RequestOptions,
): Promise<void> {
  await deleteJson<undefined, DeleteProjectRequest>(PROJECTS_PATH, { projectId }, options)
}
