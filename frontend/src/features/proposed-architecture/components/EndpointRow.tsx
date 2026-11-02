import { useId, useState } from 'react'
import { cn } from '../../../shared/lib/cn'
import { Input } from '../../../shared/ui/Input'
import { Select } from '../../../shared/ui/Select'
import { HTTP_METHODS, MODULE_DETAIL_TEXTS, ROUTE_ERROR_TEXTS } from '../constants'
import { isHttpMethod } from '../module-detail/isHttpMethod'
import type { ModuleEndpoint } from '../types'
import { validateEndpoint } from '../module-detail/validateEndpoint'

export type EndpointRowProps = {
  endpoint: ModuleEndpoint
  onChange: (endpoint: ModuleEndpoint) => void
}

export function EndpointRow({ endpoint, onChange }: EndpointRowProps) {
  const methodId = useId()
  const routeId = useId()
  const errorId = useId()
  const [isTouched, setIsTouched] = useState(false)
  const visibleError = isTouched ? validateEndpoint(endpoint) : null
  const isMethodInvalid = visibleError === 'incomplete' && endpoint.method === ''
  const isRouteInvalid = visibleError !== null && !isMethodInvalid

  return (
    <div className="flex gap-4">
      <div className="w-28 shrink-0">
        <label htmlFor={methodId} className="mb-1 block text-xs text-gray-500">
          {MODULE_DETAIL_TEXTS.methodLabel}
        </label>
        <Select
          id={methodId}
          value={endpoint.method}
          onChange={(event) => {
            const { value } = event.target
            onChange({ ...endpoint, method: isHttpMethod(value) ? value : '' })
          }}
          onBlur={() => setIsTouched(true)}
          aria-invalid={isMethodInvalid}
          aria-describedby={isMethodInvalid ? errorId : undefined}
          className={cn(
            endpoint.method === '' ? 'text-gray-400' : 'text-gray-900',
            isMethodInvalid && 'ring-1 ring-red-500',
          )}
        >
          <option value="" disabled hidden>
            {MODULE_DETAIL_TEXTS.methodPlaceholder}
          </option>
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method} className="text-gray-900">
              {method}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={routeId} className="mb-1 block text-xs text-gray-500">
          {MODULE_DETAIL_TEXTS.routeLabel}
        </label>
        <Input
          id={routeId}
          value={endpoint.route}
          onChange={(event) => onChange({ ...endpoint, route: event.target.value })}
          onBlur={() => setIsTouched(true)}
          placeholder={MODULE_DETAIL_TEXTS.routePlaceholder}
          aria-invalid={isRouteInvalid}
          aria-describedby={isRouteInvalid ? errorId : undefined}
          className={cn(isRouteInvalid && 'ring-1 ring-red-500')}
        />
        {visibleError && (
          <p id={errorId} className="mt-1 text-xs text-red-600">
            {visibleError === 'incomplete' ? MODULE_DETAIL_TEXTS.endpointIncomplete : ROUTE_ERROR_TEXTS[visibleError]}
          </p>
        )}
      </div>
    </div>
  )
}
