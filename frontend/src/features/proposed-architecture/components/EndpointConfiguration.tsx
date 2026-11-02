import { useId } from 'react'
import { Select } from '../../../shared/ui/Select'
import { AUTHENTICATION_TYPES, MODULE_DETAIL_TEXTS } from '../constants'
import { isAuthenticationType } from '../module-detail/isAuthenticationType'
import type { AuthenticationType, ModuleEndpoint } from '../types'
import { EndpointRow } from './EndpointRow'

export type EndpointConfigurationProps = {
  endpoints: ModuleEndpoint[]
  authentication: AuthenticationType | ''
  onEndpointChange: (index: number, endpoint: ModuleEndpoint) => void
  onAuthenticationChange: (authentication: AuthenticationType | '') => void
}

export function EndpointConfiguration({
  endpoints,
  authentication,
  onEndpointChange,
  onAuthenticationChange,
}: EndpointConfigurationProps) {
  const authenticationId = useId()

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900">{MODULE_DETAIL_TEXTS.endpointTitle}</h3>
      <div className="mt-3 flex max-h-56 flex-col gap-3 overflow-y-auto">
        {endpoints.map((endpoint, index) => (
          <EndpointRow
            key={index}
            endpoint={endpoint}
            onChange={(changedEndpoint) => onEndpointChange(index, changedEndpoint)}
          />
        ))}
      </div>
      <label htmlFor={authenticationId} className="mt-4 mb-1 block text-xs text-gray-500">
        {MODULE_DETAIL_TEXTS.authenticationLabel}
      </label>
      <Select
        id={authenticationId}
        value={authentication}
        onChange={(event) => {
          const { value } = event.target
          onAuthenticationChange(isAuthenticationType(value) ? value : '')
        }}
        className={authentication === '' ? 'text-gray-400' : 'text-gray-900'}
      >
        <option value="" disabled hidden>
          {MODULE_DETAIL_TEXTS.authenticationPlaceholder}
        </option>
        {AUTHENTICATION_TYPES.map((authenticationType) => (
          <option key={authenticationType} value={authenticationType} className="text-gray-900">
            {authenticationType}
          </option>
        ))}
      </Select>
    </section>
  )
}
