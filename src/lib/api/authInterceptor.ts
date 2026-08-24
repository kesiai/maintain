/**
 * 全局 HTTP 认证拦截器（借鉴 kesi/src/lib/kesi/authInterceptor.ts）
 *
 * 职责：
 * - 401 分类处理：
 *   - code=150010008（长时间未操作/账号被登出）→ 调登出接口 + 清全部登录信息 + 跳登录页
 *   - code=150010009（未修改初始密码）→ 跳转改密页 /app/changePassword
 *   - 通用令牌错误码 [100010001,100010002,100010005,150010008,150010010] → 仅清登录缓存
 *   - 普通 401（未登录/登录过期）→ 清登录态 + 提示 + 跳登录页（带 redirect 来源参数，登录后跳回）
 * - noAuthSkip：请求级选项，带该标记的请求 401 时不跳转，交由调用方自行处理
 * - 403：code=150010016/150010020（无权限访问中台/前台）跳登录；通用 403 弹错误提示
 * - 406/417：maintain 无 /nolicense、/nopermission 页面，降级为 toast 错误提示
 *   （如需页面跳转，把 goTo 目标常量放开即可）
 *
 * 业务码 1500100xx / 1000100xx 沿用 KESI core 约定；若运维后端不返回这些业务码，
 * 所有 401 都会落入通用分支（清登录态 + 跳登录页），不影响主流程。
 *
 * 与参考实现的关键差异：
 * 参考实现把拦截器注册在默认 axios 实例上；但 @kesi/client 内部通过
 * axios.create() 为每个 createAPI 创建独立实例，默认实例的拦截器不会传播到这些子实例。
 * 因此这里在共享的 axios 模块上打补丁（axios.create 包装），使之后创建的所有实例
 * （含 src/lib/api/client.ts 的模块级 apiClient/authClient 等）都装配同一响应拦截器。
 *
 * 装配前提：
 * - @kesi/client 已将 axios 外置（kesi-client/vite.config external）
 * - 本应用 vite.config 通过 dedupe: ['axios'] 与 SDK 共用同一份 axios 模块
 * - main.tsx 必须在 import App 之前引入本模块（本模块加载时即装配补丁，
 *   早于 @kesi/client 各 API 实例的创建）
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { getConfig, setConfig, getHeaders } from '@kesi/client'
import { toast } from 'sonner'
import i18n from '@/i18n'

/** 拦截器可读取的响应错误最小结构 */
interface AuthErrorShape {
  config?: {
    url?: string
    noAuthSkip?: boolean
  }
  response?: {
    status?: number
    data?: unknown
  }
}

/** 后端业务错误响应体 */
interface ApiErrorData {
  code?: unknown
  message?: string
}

// 防止并发 401（多个请求同时失败）重复触发清登录态 / 跳转 / toast
let handlingUnauthorized = false

// 401 通用令牌错误码（token 超时 / 校验失败 / 长时间未登录等）——仅清缓存，不做额外跳转
const TOKEN_ERROR_CODES = [100010001, 100010002, 100010005, 150010008, 150010010]
// 403 无权限业务码：150010016 无权限访问中台 / 150010020 无权限访问前台
const FORBIDDEN_CODES = ['150010016', '150010020']

const LOGIN_PATH = '/login'
// maintain 的改密页挂在 /app/changePassword（参考实现为 /pwdPage?id={userId}）
const CHANGE_PWD_PATH = '/app/changePassword'
// maintain 暂无专用页面，406/417 降级为 toast；如后续新增页面可放开跳转
// const NO_LICENSE_PATH = '/nolicense'
// const NO_PERMISSION_PATH = '/nopermission'

/** 是否为登录/登出接口——登录、登出失败不应触发全局 401 处理，交由调用方自行处理 */
function isLoginRequest(error: AuthErrorShape): boolean {
  // @kesi/client 的 config.url 是相对路径且不带前导斜杠（如 'login'、'login/exit'），
  // 这里取首个路径段兼容 'login'、'login/exit'、'/api/login?x' 等格式
  const path = (error?.config?.url || '').replace(/^\/+/, '').split(/[/?]/)[0]
  return path === 'login'
}

/** 请求是否带 noAuthSkip 标记（401 时不跳转，由调用方自行处理） */
function isNoAuthSkip(error: AuthErrorShape): boolean {
  return !!error?.config?.noAuthSkip
}

/** 清除本地登录信息（@kesi/client 的 useUser 固定使用 key='user'） */
function clearAuthState(): void {
  try {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    // @kesi/client 全局配置里的 user 同步清空，避免后续请求继续携带过期 token
    setConfig({ user: undefined })
  } catch (e) {
    console.error('[auth] 清除登录信息失败:', e)
  }
}

/** 跳转 hash 路由（已在目标页则跳过） */
function goTo(path: string): void {
  if (window.location.hash !== `#${path}`) {
    window.location.hash = path
  }
}

/** 构造带 redirect 来源的登录地址（登录后跳回原页面） */
function buildLoginUrl(): string {
  // 当前 hash 路径，如 /app/service/list；已在登录/改密页则不携带来源
  let router = window.location.hash.substring(1) || ''
  if (router.includes('/login') || router.includes('/app/changePassword')) {
    router = ''
  }
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(router)}`
}

/** 解锁并发保护，允许后续 401 再次触发 */
function unlock(): void {
  window.setTimeout(() => {
    handlingUnauthorized = false
  }, 1500)
}

/** 普通 401：清登录态 + 提示 + 跳登录页（带 redirect） */
function handleUnauthorized(): void {
  if (handlingUnauthorized) return
  handlingUnauthorized = true
  clearAuthState()
  toast.error(i18n.t('登录已过期'), { description: i18n.t('请重新登录') })
  goTo(buildLoginUrl())
  unlock()
}

/** code=150010008 长时间未操作：调登出接口 + 清全部登录信息 + 跳登录页 */
async function handleTokenTimeout(): Promise<void> {
  if (handlingUnauthorized) return
  handlingUnauthorized = true
  try {
    // 通知后端清理会话（与 src/lib/api/auth-api.ts 的 logout 一致，不携带 Authorization）
    const rest = getConfig().rest || '/api'
    await axios.post(`${rest}/login/exit`, null, {
      headers: getHeaders({ ignoreAuthorization: true }),
    })
  } catch (e) {
    // 登出接口失败不阻断本地清理
    console.error('[auth] 登出接口调用失败:', e)
  }
  clearAuthState()
  toast.error(i18n.t('登录已过期'), { description: i18n.t('长时间未操作，请重新登录') })
  goTo(buildLoginUrl())
  unlock()
}

/** code=150010009 未修改初始密码：跳转改密页 */
function handlePasswordChangeRequired(): void {
  goTo(CHANGE_PWD_PATH)
}

/** 403：无权限业务码跳登录，通用 403 弹错误提示 */
function handleForbidden(codeNum: number, message?: string): void {
  if (FORBIDDEN_CODES.includes(String(codeNum))) {
    toast.error(message || i18n.t('无权限访问'))
    goTo(LOGIN_PATH)
  } else {
    toast.error(message || i18n.t('无权限'), { description: i18n.t('您没有执行此操作的权限') })
  }
}

/** 响应错误统一处理：401/403/406/417 */
function onResponseError(error: unknown): Promise<never> {
  const e = error as AuthErrorShape
  const status = e?.response?.status
  const json = e?.response?.data as ApiErrorData | undefined
  const codeNum = Number(json?.code) // 兼容 string / number 两种业务码

  // 登录/登出接口自身失败交由调用方处理，不触发全局逻辑
  if (isLoginRequest(e)) {
    return Promise.reject(error)
  }

  if (status === 401) {
    if (codeNum === 150010008) {
      void handleTokenTimeout()
    } else if (codeNum === 150010009) {
      handlePasswordChangeRequired()
    } else {
      // 通用令牌错误码：仅清登录缓存
      if (TOKEN_ERROR_CODES.includes(codeNum)) {
        clearAuthState()
      }
      // noAuthSkip：不跳转，交由调用方处理
      if (isNoAuthSkip(e)) {
        return Promise.reject(error)
      }
      handleUnauthorized()
    }
  } else if (status === 403) {
    handleForbidden(codeNum, json?.message)
  } else if (status === 406) {
    // maintain 无 /nolicense 页面，降级为错误提示
    toast.error(i18n.t('授权异常'), { description: i18n.t('请联系管理员检查授权状态') })
  } else if (status === 417) {
    // maintain 无 /nopermission 页面，降级为错误提示
    toast.error(i18n.t('无权限访问'), { description: i18n.t('您没有访问该功能的权限') })
  }

  return Promise.reject(error)
}

let installed = false

/**
 * 装配全局 axios 响应拦截器，处理 401/403/406/417。
 *
 * 注意：@kesi/client 通过 axios.create() 为每个 createAPI 创建独立实例，
 * 默认实例的拦截器不会传播到这些子实例，因此除注册默认实例外，
 * 还必须包装共享 axios 模块的 create，让之后创建的所有实例都带上拦截器。
 */
export function setupAuthInterceptor(): void {
  if (installed) return
  installed = true

  // 1) 默认 axios 实例（应用内直接使用 axios 的请求，与参考实现保持一致）
  axios.interceptors.response.use(
    (response) => response,
    onResponseError,
  )

  // 2) 包装 axios.create：@kesi/client 的 createHttp 使用共享模块的 create 建实例，
  //    补丁后每个新实例都装配上同一响应拦截器。
  const originalCreate = axios.create
  axios.create = (config?: AxiosRequestConfig): AxiosInstance => {
    const instance = originalCreate(config)
    instance.interceptors.response.use(
      (response) => response,
      onResponseError,
    )
    return instance
  }
}

// 模块加载即装配（幂等）。main.tsx 必须在 import App 之前引入本模块，
// 保证 axios.create 补丁先于 src/lib/api/client.ts 的模块级 createAPI 实例创建生效。
setupAuthInterceptor()
