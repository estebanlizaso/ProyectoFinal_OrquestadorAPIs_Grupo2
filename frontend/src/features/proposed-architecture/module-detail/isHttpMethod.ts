import { HTTP_METHODS } from '../constants'
import type { HttpMethod } from '../types'

export function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHODS.some((method) => method === value)
}
