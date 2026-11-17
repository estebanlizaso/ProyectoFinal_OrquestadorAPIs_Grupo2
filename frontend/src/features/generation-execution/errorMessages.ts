import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const GENERATION_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
    [HTTP_STATUS.badGateway]: 'No se pudo generar el flujo. Probá de nuevo.',
  },
}
