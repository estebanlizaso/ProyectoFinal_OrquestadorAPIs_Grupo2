import type { AiModelsResponse, AiSelectionRequest } from './types'

export function resolveSelection(
  selection: AiSelectionRequest | null,
  catalog: AiModelsResponse,
): AiSelectionRequest | null {
  if (!selection) return null
  const provider = catalog.providers.find((item) => item.id === selection.provider)
  if (!provider) return null
  const model = selection.model === null && provider.models.length === 1
    ? provider.models[0]
    : provider.models.find((item) => item.id === selection.model)
  return model ? { provider: provider.id, model: model.id } : null
}

export function isAiSelection(value: unknown): value is AiSelectionRequest {
  return typeof value === 'object' && value !== null &&
    'provider' in value && typeof value.provider === 'string' &&
    'model' in value && (typeof value.model === 'string' || value.model === null)
}

export function isAiModelsResponse(value: unknown): value is AiModelsResponse {
  return typeof value === 'object' && value !== null &&
    'defaultSelection' in value && (value.defaultSelection === null || isAiSelection(value.defaultSelection)) &&
    'providers' in value && Array.isArray(value.providers) &&
    value.providers.every((provider: unknown) =>
      typeof provider === 'object' && provider !== null &&
      'id' in provider && typeof provider.id === 'string' && provider.id.trim() !== '' &&
      'models' in provider && Array.isArray(provider.models) &&
      provider.models.every((model: unknown) =>
        typeof model === 'object' && model !== null &&
        'id' in model && typeof model.id === 'string' && model.id.trim() !== '' &&
        'name' in model && typeof model.name === 'string' && model.name.trim() !== '',
      ),
    )
}
