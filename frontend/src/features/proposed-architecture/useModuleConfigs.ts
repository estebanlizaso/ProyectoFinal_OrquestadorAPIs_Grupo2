import { useCallback, useState } from 'react'
import { isAuthenticationType } from './module-detail/isAuthenticationType'
import { isHttpMethod } from './module-detail/isHttpMethod'
import type { ModuleConfig, ModuleEndpoint } from './types'

type ModuleConfigs = Record<string, ModuleConfig>

export type UseModuleConfigsResult = {
  configs: ModuleConfigs
  saveConfig: (nodeKey: string, config: ModuleConfig) => void
}

function buildStorageKey(projectId: number): string {
  return `module-configs:${projectId}`
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isModuleEndpoint(value: unknown): value is ModuleEndpoint {
  return (
    isObject(value) &&
    'method' in value &&
    typeof value.method === 'string' &&
    (value.method === '' || isHttpMethod(value.method)) &&
    'route' in value &&
    typeof value.route === 'string'
  )
}

function isModuleConfig(value: unknown): value is ModuleConfig {
  return (
    isObject(value) &&
    'endpoints' in value &&
    Array.isArray(value.endpoints) &&
    value.endpoints.every(isModuleEndpoint) &&
    'authentication' in value &&
    typeof value.authentication === 'string' &&
    (value.authentication === '' || isAuthenticationType(value.authentication))
  )
}

function isModuleConfigs(value: unknown): value is ModuleConfigs {
  return isObject(value) && !Array.isArray(value) && Object.values(value).every(isModuleConfig)
}

function readConfigs(projectId: number): ModuleConfigs {
  try {
    const storedConfigs: unknown = JSON.parse(localStorage.getItem(buildStorageKey(projectId)) ?? 'null')
    return isModuleConfigs(storedConfigs) ? storedConfigs : {}
  } catch {
    return {}
  }
}

function writeConfigs(projectId: number, configs: ModuleConfigs): void {
  try {
    localStorage.setItem(buildStorageKey(projectId), JSON.stringify(configs))
  } catch {
    return
  }
}

export function clearModuleConfigs(projectId: number): void {
  try {
    localStorage.removeItem(buildStorageKey(projectId))
  } catch {
    return
  }
}

export function useModuleConfigs(projectId: number): UseModuleConfigsResult {
  const [configs, setConfigs] = useState<ModuleConfigs>(() => readConfigs(projectId))

  const saveConfig = useCallback(
    (nodeKey: string, config: ModuleConfig): void => {
      setConfigs((currentConfigs) => {
        const nextConfigs = { ...currentConfigs, [nodeKey]: config }
        writeConfigs(projectId, nextConfigs)
        return nextConfigs
      })
    },
    [projectId],
  )

  return { configs, saveConfig }
}
