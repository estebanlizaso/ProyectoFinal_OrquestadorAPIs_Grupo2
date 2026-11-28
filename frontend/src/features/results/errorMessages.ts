import type { ErrorMessages } from '../../shared/api/getErrorMessage'
import { HTTP_STATUS } from '../../shared/api/httpStatus'

export const RESULTS_DOWNLOAD_ERROR_MESSAGES: ErrorMessages = {
  preferBackendMessage: true,
  byStatus: {
    [HTTP_STATUS.notFound]: 'Todavía no hay archivos generados para este proyecto.',
  },
}
