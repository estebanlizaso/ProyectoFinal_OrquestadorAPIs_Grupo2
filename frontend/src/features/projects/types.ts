export type ProjectResponse = {
  name: string
  description: string | null
  projectId: number
  created_at: string | null
  /** Lo publica el back en `finish_proyect`; mientras no llegue se toma como no finalizado. */
  finish_proyect?: boolean
}

export type ProjectsResponse = {
  body: ProjectResponse[]
  next: string | null
  prev: string | null
}

export type DeleteProjectRequest = {
  projectId: ProjectResponse['projectId']
}

export type CreateProjectRequest = {
  name: string
}