export type ProjectResponse = {
  name: string
  description: string | null
  projectId: number
  created_at: string | null
}

export type ProjectsResponse = {
  body: ProjectResponse[]
}

export type DeleteProjectRequest = {
  projectId: ProjectResponse['projectId']
}
