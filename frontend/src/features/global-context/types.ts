export type CreateProjectContextRequest = {
  prompt: string
}

export type GeneratedCodeResponse = {
  status: string
  language: string
  summary: string
  questions: string[]
  plan: string[]
  code: string | null
}

export type PlannerContentResponse = {
  status: string
  reply: string
  summary: string
  questions: string[]
  plan: string[]
  assumptions: string[]
  language: string | null
}

export type OrchestrationNodeResponse = {
  id: number
  key: string
  name: string
  description: string | null
  kind: string
  role: string | null
  responsibility: string | null
  status: string
  userNotes: string | null
  isActive: boolean
  sortOrder: number
}

export type OrchestrationRelationResponse = {
  id: number
  from: string
  to: string
  label: string
  operation: string | null
  description: string | null
  kind: string | null
  sortOrder: number
}

export type ProjectContextResponse = {
  contextId: number
  projectId: number
  initialPrompt: string
  generatedContent: GeneratedCodeResponse | null
  planner: PlannerContentResponse | null
  nodes: OrchestrationNodeResponse[]
  relations: OrchestrationRelationResponse[]
  mapVersion: number
  resumen: string | null
  updatedAt: string | null
}

export type ProjectContextGenerationErrorResponse = {
  contextId: number
  message: string
}

export type InitialProjectPromptResponse = {
  initialPrompt: string
}