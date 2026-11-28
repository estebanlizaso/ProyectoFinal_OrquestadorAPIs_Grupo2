export type AiSelectionRequest = {
  provider: string
  model: string | null
}

export type AiModelResponse = {
  id: string
  name: string
}

export type AiProviderResponse = {
  id: string
  models: AiModelResponse[]
}

export type AiModelsResponse = {
  defaultSelection: AiSelectionRequest | null
  providers: AiProviderResponse[]
}
