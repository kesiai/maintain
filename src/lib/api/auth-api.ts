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
