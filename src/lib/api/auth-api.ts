import { apiClient, authClient, asJson } from './client'
import type { UserInfo } from '@kesi/client'
import { getConfig } from '@kesi/client'

export interface LoginParams {
  username: string
  password: string
  /** 验证码（后端需要时填写） */
  code?: string
}

export interface LoginResult extends UserInfo {
  accessToken?: string
  [key: string]: any
}

/**
 * 登录：POST /api/login
 *
 * 后端返回的 token 是裸 accessToken，而 @kesi/client 会原样放入
 * Authorization 头，后端期望 `Bearer <token>`，因此登录后由调用方
 * 归一化 user.token = 'Bearer ' + accessToken。
 */
export async function login(params: LoginParams): Promise<LoginResult> {
  console.log('login params', getConfig(), params)
  const res = await authClient.fetch('login', { method: 'POST', data: params })
  return asJson<LoginResult>(res)
}

/** 登出：POST /api/login/exit */
export async function logout(): Promise<void> {
  await authClient.fetch('login/exit', { method: 'POST' })
}

export interface ChangePasswordParams {
  oldPassword: string
  newPassword: string
  newPassword2: string
}

/** 修改密码：PUT /api/current/password */
export async function changePassword(body: ChangePasswordParams): Promise<void> {
  await apiClient.fetch('/current/password', { method: 'PUT', data: body })
}

/* ---------------- 管理员初始化（对齐旧版 old/src 逻辑） ---------------- */

/** 初始化页路由（无 admin 账号时跳转） */
export const INIT_PATH = '/init'

/**
 * 检查系统是否已初始化管理员：GET /api/user/admin/check
 * 返回 HTTP 404 = 未初始化；其他状态 = 已有（含异常，按已有处理不阻断进入）
 */
export async function checkAdmin(): Promise<boolean> {
  try {
    const res = await authClient.fetch('user/admin/check', { method: 'GET', noAuthSkip: true })
    return res?.status !== 404
  } catch (e: any) {
    return e?.response?.status !== 404
  }
}

/**
 * 初始化管理员：POST /api/user/admin { password }
 * 用户名固定为 admin（与旧版 Reg.js 一致，后端 /user/admin 仅接受密码）
 */
export async function registerAdmin(password: string): Promise<void> {
  await authClient.fetch('user/admin', { method: 'POST', data: { password }, noAuthSkip: true })
}

/**
 * 校验系统必须存在 admin 账号：无 admin 时跳转初始化页 /init
 * （启动时调用，对齐旧版 index.js 的 /user/admin/check 404 → /regest）
 */
export async function redirectToInitIfNoAdmin(): Promise<void> {
  const hasAdmin = await checkAdmin()
  if (!hasAdmin && window.location.hash !== `#${INIT_PATH}`) {
    window.location.hash = INIT_PATH
  }
}
