import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import './index.css'
import { initConfig } from '@/lib/config'
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
