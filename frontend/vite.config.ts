import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: API_PROXY_TARGET ? { '/api': { target: API_PROXY_TARGET, changeOrigin: true } } : undefined,
    },
  }
})
