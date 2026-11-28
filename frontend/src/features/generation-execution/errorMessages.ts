import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const GENERATION_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
    [HTTP_STATUS.badGateway]: 'No se pudo generar el flujo. Probá de nuevo.',
  },
}

const FINISH_PROJECT_ERROR = 'El flujo se generó, pero no pudimos marcar el proyecto como finalizado. Probá de nuevo.'

export const FINISH_PROJECT_ERROR_MESSAGES: ErrorMessages = {
  fallback: FINISH_PROJECT_ERROR,
  network: FINISH_PROJECT_ERROR,
  timeout: FINISH_PROJECT_ERROR,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
    [HTTP_STATUS.serverError]: FINISH_PROJECT_ERROR,
  },
}
