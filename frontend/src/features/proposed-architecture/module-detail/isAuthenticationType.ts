import { AUTHENTICATION_TYPES } from '../constants'
import type { AuthenticationType } from '../types'

export function isAuthenticationType(value: string): value is AuthenticationType {
  return AUTHENTICATION_TYPES.some((authenticationType) => authenticationType === value)
}
