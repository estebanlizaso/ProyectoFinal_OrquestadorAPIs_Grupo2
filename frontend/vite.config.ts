import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { apiMocksPlugin, resolveApiMockScenario } from './mocks/apiMocksPlugin.ts'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET, API_MOCKS } = loadEnv(mode, process.cwd(), '')
  const apiMockScenario = resolveApiMockScenario(API_MOCKS)

  return {
    plugins: [react(), tailwindcss(), apiMockScenario && apiMocksPlugin(apiMockScenario)],
    server: {
      proxy: API_PROXY_TARGET ? { '/api': { target: API_PROXY_TARGET, changeOrigin: true } } : undefined,
    },
  }
})
