interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_AI_CONTEXT_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
