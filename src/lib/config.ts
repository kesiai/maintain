import { setConfig } from '@kesi/client'
import { toast } from 'sonner'

/**
 * 初始化 @kesi/client 全局配置。
 *
 * - rest: 后端 API 挂载在站点根路径（/api/... 由 resource 'api' 拼接）。
 *   开发环境经 vite proxy 转发，生产环境同源部署。
 * - toast: 接入 sonner，让 SDK 内部错误提示与全局统一。
 */
export function initConfig() {
  setConfig({
    rest: '/api',
    language: 'zh-CN',
    toast: {
      info: (msg) => toast.info(msg),
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
      warning: (msg) => toast.warning(msg),
    },
  })
}
