import { setConfig, useUser } from '@kesi/client'
import { toast } from 'sonner'
import { getStoredLocale } from '@/i18n'

/**
 * 初始化 @kesi/client 全局配置。
 *
 * - rest: 后端 API 挂载在站点根路径（/api/... 由 resource 'api' 拼接）。
 *   开发环境经 vite proxy 转发，生产环境同源部署。
 * - language: 读取持久化语言（默认 zh-CN），随 Accept-Language 请求头发送。
 * - toast: 接入 sonner，让 SDK 内部错误提示与全局统一。
 */
export function initConfig() {
  setConfig({
    rest: '/api',
    language: getStoredLocale(),
    toast: {
      info: (msg) => toast.info(msg),
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
      warning: (msg) => toast.warning(msg),
    },
  })
  // 渲染前同步恢复持久化登录态（对齐 kesi initKesiConfig 的 loadUser 调用）。
  // 必须在首帧渲染前完成，否则 ProtectedRoute 首帧读不到 user 会先跳登录页。
  // useUser 内部无 React hooks，可在模块级安全调用。
  useUser().loadUser()
}
