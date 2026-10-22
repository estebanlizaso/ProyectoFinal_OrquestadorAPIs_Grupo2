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

export type ProjectContextResponse = {
  contextId: number
  projectId: number
  initialPrompt: string
  generatedContent: GeneratedCodeResponse
}

export type ProjectContextGenerationErrorResponse = {
  contextId: number
  message: string
}

export type InitialProjectPromptResponse = {
  initialPrompt: string
}