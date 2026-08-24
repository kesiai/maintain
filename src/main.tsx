import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import './index.css'
import { initConfig } from '@/lib/config'
// 装配全局 axios 认证拦截器（副作用导入，幂等）。
// 必须在 import App 之前：本模块加载时即包装 axios.create，
// 早于 @kesi/client 各 API 实例（src/lib/api/client.ts 的模块级 createAPI）创建。
import '@/lib/api/authInterceptor'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import App from '@/App'

// 初始化 @kesi/client 全局配置（rest 根路径 /api/...，接入 sonner toast）
initConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="kesi-ui-theme">
      <HashRouter>
        <TooltipProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </HashRouter>
    </ThemeProvider>
  </StrictMode>,
)
