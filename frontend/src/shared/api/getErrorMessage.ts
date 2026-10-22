import { ApiError } from './ApiError'
import { HTTP_STATUS } from './httpStatus'

export type ErrorMessages = {
  fallback?: string
  network?: string
  timeout?: string
  byStatus?: Partial<Record<number, string>>
  preferBackendMessage?: boolean
}

const DEFAULT_ERROR_MESSAGES = {
  fallback: 'Error desconocido, probá de nuevo en unos minutos.',
  network: 'No pudimos conectarnos con el servidor. Revisá tu conexión.',
  timeout: 'El servidor tardó demasiado en responder. Probá de nuevo.',
  byStatus: {
    [HTTP_STATUS.serverError]: 'Ocurrió un error en el servidor. Probá de nuevo en unos minutos.',
  },
}

function getBackendMessage(details: unknown): string | null {
  if (
    typeof details === 'object' &&
    details !== null &&
    'message' in details &&
    typeof details.message === 'string' &&
    details.message.trim() !== ''
  ) {
    return details.message
  }
  return null
}

export function getErrorMessage(error: Error, messages: ErrorMessages = {}): string {
  const fallback = messages.fallback ?? DEFAULT_ERROR_MESSAGES.fallback
  const byStatus: Partial<Record<number, string>> = { ...DEFAULT_ERROR_MESSAGES.byStatus, ...messages.byStatus }

  if (!(error instanceof ApiError)) {
    return fallback
  }
  if (error.kind === 'network') {
    return messages.network ?? DEFAULT_ERROR_MESSAGES.network
  }
  if (error.kind === 'timeout') {
    return messages.timeout ?? DEFAULT_ERROR_MESSAGES.timeout
  }
  if (error.kind === 'http' && error.status !== null) {
    const backendMessage = messages.preferBackendMessage ? getBackendMessage(error.details) : null
    return backendMessage ?? byStatus[error.status] ?? fallback
  }
  return fallback
}
