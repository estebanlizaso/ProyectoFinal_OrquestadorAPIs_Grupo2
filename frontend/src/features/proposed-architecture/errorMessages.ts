import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const MODULE_RULE_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.badRequest]: 'Revisá la regla e intentá de nuevo.',
    [HTTP_STATUS.notFound]: 'No encontramos este módulo. Puede que el mapa haya cambiado en Contexto global.',
    [HTTP_STATUS.conflict]: 'Hubo un cambio mientras se guardaba la regla. Probá de nuevo.',
    [HTTP_STATUS.badGateway]: 'La IA no pudo actualizar el diagrama. Probá de nuevo.',
  },
}
