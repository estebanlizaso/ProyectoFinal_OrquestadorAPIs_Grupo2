import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const PROJECT_CREATE_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.badRequest]: 'El nombre no es válido.',
    [HTTP_STATUS.conflict]: 'Ya existe un proyecto con ese nombre.',
  },
}

export const PROJECT_DELETE_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
  },
}

export const PROJECT_CONTEXT_DOWNLOAD_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto todavía no tiene contexto para descargar.',
  },
}
