import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const GLOBAL_CONTEXT_ERROR_MESSAGES: ErrorMessages = {
  byStatus: {
    [HTTP_STATUS.badRequest]: 'Revisá lo que escribiste e intentá de nuevo.',
    [HTTP_STATUS.notFound]: 'Este proyecto ya no existe.',
    [HTTP_STATUS.conflict]: 'Hubo un cambio mientras se generaba la respuesta. Enviá el mensaje de nuevo.',
    [HTTP_STATUS.badGateway]: 'La IA no pudo generar el contexto. Probá de nuevo.',
  },
}
