import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // API 地址与旧版保持一致：开发环境通过代理转发到后端，生产环境同源。
  const API_PROXY_TARGET = env.VITE_API_PROXY || 'http://192.168.99.101:13030/'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      // axios：@kesi/client 已将其外置（见 kesi-client/vite.config external），
      // 这里强制应用与 SDK 共用同一份 axios 模块，以便应用层装配的全局响应拦截器
      // 能覆盖 @kesi/client 创建的所有请求实例（见 src/lib/api/authInterceptor.ts）。
      dedupe: ['axios'],
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
