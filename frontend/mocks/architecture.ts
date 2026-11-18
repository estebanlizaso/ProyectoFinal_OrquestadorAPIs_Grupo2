import type { ArchitectureResponse } from '../src/features/generation-execution/types.ts'

export const MOCK_DRIVE_FOLDER_LINK = 'https://drive.google.com/drive/folders/mock-folder'

export const MOCK_EMPTY_ZIP = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array<number>(18).fill(0)])

export const MOCK_PACKAGE_FILE_NAME = 'architecture.zip'

export const MOCK_POSTMAN_FILE_NAME = 'postman_collection.json'

export const MOCK_NOT_GENERATED_MESSAGE = 'Todavía no hay un paquete de arquitectura subido para este proyecto.'

export function buildMockArchitecture(projectId: number, contextId: number): ArchitectureResponse {
  return {
    contextId,
    projectId,
    language: 'dotnet',
    mapVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: 'Solución generada con datos simulados.',
    envExample: null,
    contexts: [],
    warnings: [],
    contextChanged: false,
    drive: {
      fileName: MOCK_PACKAGE_FILE_NAME,
      fileId: 'mock-file',
      webViewLink: null,
      folderId: 'mock-folder',
      folderName: `proyecto-${projectId}`,
      folderWebViewLink: MOCK_DRIVE_FOLDER_LINK,
    },
    postmanCollection: { info: { name: `Proyecto ${projectId}` }, item: [] },
    goToDrive: MOCK_DRIVE_FOLDER_LINK,
    downloadFile: `/api/projects/${projectId}/architecture/package`,
    downloadPostmanCollection: `/api/projects/${projectId}/architecture/postman-collection`,
  }
}
