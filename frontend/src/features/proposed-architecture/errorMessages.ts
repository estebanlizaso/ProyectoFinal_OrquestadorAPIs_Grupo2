import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const MODULE_CONFIG_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.badRequest]: 'Revisá los datos e intentá de nuevo.',
    [HTTP_STATUS.notFound]: 'No encontramos este módulo. Puede que el mapa haya cambiado en Contexto global.',
    [HTTP_STATUS.conflict]: 'Hubo un cambio mientras se guardaba la configuración. Probá de nuevo.',
  },
}
