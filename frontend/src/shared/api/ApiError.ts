export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'parse'

type ApiErrorParams = {
  kind: ApiErrorKind
  status: number | null
  message: string
  details?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly details: unknown

  constructor({ kind, status, message, details }: ApiErrorParams) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.details = details
  }
}
