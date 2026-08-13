import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// API 地址与旧版保持一致：开发环境通过代理转发到后端，生产环境同源。
const API_PROXY_TARGET = process.env.VITE_API_PROXY || 'http://192.168.99.101:13030/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
})
