import { ApiError } from './ApiError'

type HttpMethod = 'GET' | 'POST' | 'DELETE'

export type RequestOptions = {
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 15_000

const ERROR_MESSAGES = {
  missingApiUrl: 'Falta definir la variable de entorno VITE_API_URL',
  network: 'No se pudo conectar con el servidor',
  timeout: 'El servidor tardó demasiado en responder',
  aborted: 'La solicitud fue cancelada',
  invalidJson: 'La respuesta del servidor no es un JSON válido',
  emptyBody: 'El servidor respondió sin contenido',
}

function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    throw new Error(ERROR_MESSAGES.missingApiUrl)
  }
  return apiUrl
}

function getHttpErrorMessage(status: number, details: unknown): string {
  if (
    typeof details === 'object' &&
    details !== null &&
    'title' in details &&
    typeof details.title === 'string'
  ) {
    return details.title
  }
  return `Error HTTP ${status}`
}

async function readErrorDetails(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') {
    return undefined
  }
  try {
    const details: unknown = JSON.parse(text)
    return details
  } catch {
    return text
  }
}

async function readJsonBody<T>(response: Response): Promise<T | undefined> {
  const text = await response.text()
  if (text === '') {
    return undefined
  }
  try {
    const data: T = JSON.parse(text)
    return data
  } catch {
    throw new ApiError({
      kind: 'parse',
      status: response.status,
      message: ERROR_MESSAGES.invalidJson,
      details: text,
    })
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body: unknown,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {},
): Promise<T | undefined> {
  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)
  const abortFromCaller = (): void => controller.abort()
  signal?.addEventListener('abort', abortFromCaller)

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (didTimeout) {
      throw new ApiError({ kind: 'timeout', status: null, message: ERROR_MESSAGES.timeout })
    }
    if (controller.signal.aborted) {
      throw new ApiError({ kind: 'aborted', status: null, message: ERROR_MESSAGES.aborted })
    }
    throw new ApiError({
      kind: 'network',
      status: null,
      message: ERROR_MESSAGES.network,
      details: error,
    })
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  if (!response.ok) {
    const details = await readErrorDetails(response)
    throw new ApiError({
      kind: 'http',
      status: response.status,
      message: getHttpErrorMessage(response.status, details),
      details,
    })
  }

  return readJsonBody<T>(response)
}

function requireBody<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new ApiError({ kind: 'parse', status: null, message: ERROR_MESSAGES.emptyBody })
  }
  return data
}

export async function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  return requireBody(await request<T>('GET', path, undefined, options))
}

export async function postJson<T, B>(
  path: string,
  body: B,
  options?: RequestOptions,
): Promise<T> {
  return requireBody(await request<T>('POST', path, body, options))
}

export async function deleteJson<T = undefined, B = undefined>(
  path: string,
  body?: B,
  options?: RequestOptions,
): Promise<T | undefined> {
  return request<T>('DELETE', path, body, options)
}
