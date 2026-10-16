import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const PROJECT_CREATE_ERROR_MESSAGES: ErrorMessages = {
  byStatus: {
    [HTTP_STATUS.badRequest]: 'El nombre no es válido.',
  },
}

export const PROJECT_DELETE_ERROR_MESSAGES: ErrorMessages = {
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
  },
}
