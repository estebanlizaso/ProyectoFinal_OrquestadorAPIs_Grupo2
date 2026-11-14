import type { AiSelectionRequest } from '../ai-selection/types.ts'

export type GenerateArchitectureRequest = {
  language: string | null
  aiSelection: AiSelectionRequest
}

export type ArchitectureEnvVarResponse = {
  name: string
  example: string | null
  description: string | null
}

export type ArchitectureContextResponse = {
  key: string
  name: string
  summary: string
  code: string
  dependencies: string[]
  env: ArchitectureEnvVarResponse[]
  assumptions: string[]
  warnings: string[]
}

export type ArchitectureDriveArtifactResponse = {
  fileName: string
  fileId: string
  webViewLink: string | null
  folderId: string | null
  folderName: string | null
  folderWebViewLink: string | null
}

export type ArchitectureResponse = {
  contextId: number
  projectId: number
  language: string
  mapVersion: number
  generatedAt: string
  summary: string
  envExample: string | null
  contexts: ArchitectureContextResponse[]
  warnings: string[]
  contextChanged: boolean
  drive: ArchitectureDriveArtifactResponse | null
  postmanCollection: unknown
  goToDrive: string | null
  downloadFile: string | null
  downloadPostmanCollection: string | null
}

export type ArchitectureGenerationErrorResponse = {
  message: string
}
