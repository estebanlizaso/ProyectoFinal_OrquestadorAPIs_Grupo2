import type { RouteError } from '../types'

const PARAMETER_PATTERN = /\{[A-Za-z0-9_]+\}/g
const ALLOWED_CHARACTERS_PATTERN = /^[A-Za-z0-9\-_./]*$/

export function validateRoute(route: string): RouteError | null {
  if (!route.startsWith('/')) {
    return 'missingLeadingSlash'
  }
  if (/\s/.test(route)) {
    return 'hasSpaces'
  }
  if (route.includes('?')) {
    return 'hasQuery'
  }
  if (route.includes('//')) {
    return 'hasDoubleSlash'
  }
  const routeWithoutParameters = route.replace(PARAMETER_PATTERN, '')
  if (routeWithoutParameters.includes('{') || routeWithoutParameters.includes('}')) {
    return 'invalidParameter'
  }
  if (!ALLOWED_CHARACTERS_PATTERN.test(routeWithoutParameters)) {
    return 'invalidCharacters'
  }
  return null
}
