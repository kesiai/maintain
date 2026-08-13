import { createAPI, getConfig } from '@kesi/client'

/** createAPI().fetch 的返回结构（{ json, data, status, headers }） */
export type ApiFetchResponse = Awaited<ReturnType<typeof apiClient.fetch>>

/**
 * 共享 API 客户端（resource = 'api'，拼接出 /api/... 地址）。
 *
 * 依据 api-spec.md：业务模块在下方各自封装为类型化方法，
 * 页面只 import 封装后的模块，不直接触碰裸 fetch / { json }。
 *
 * 后端接口多为自定义动作（/api/docker/...、/api/login 等），
 * 不符合平台 REST 约定，故统一走 fetch() 并包语义化方法，
 * 不依赖 createAPI 的 save/get/delete 约定。
 */
export const apiClient = createAPI({
  name: '',
})

/** 无鉴权的客户端（登录 / 登出等） */
export const authClient = createAPI({
  name: '',
  ignoreAuthorization: true,
})

/** 操作日志资源客户端（api/opsLog） */
export const opsLogAPI = createAPI({ name: 'opsLog' })

/** 日志清理周期资源客户端（api/logCycle） */
export const logCycleAPI = createAPI({ name: 'logCycle' })

/** 前端模块资源客户端（api/front） */
export const frontAPI = createAPI({ name: 'front', idProp: 'name' })

/** fetch 返回 { json, status, headers }，很多后端直接返回数组/对象 */
export const asJson = <T>(r: ApiFetchResponse): T => (r?.json as T) ?? (r as unknown as T)

export const asArray = <T>(r: ApiFetchResponse): T[] => {
  const data = r?.json
  return Array.isArray(data) ? (data as T[]) : []
}

/** 统一的错误信息提取 */
export function errorMessage(err: unknown): string {
  const e = err as {
    json?: { _error?: string; message?: string } | { _error?: string; message?: string }[]
    message?: string
  }
  const json = Array.isArray(e?.json) ? e.json[0] : e?.json
  return json?._error ?? json?.message ?? e?.message ?? '请求失败，请稍后重试'
}

/**
 * 原始请求：文本 / FormData / 二进制。自动携带 Authorization 头。
 * 适用于 createAPI 强制 JSON 之外的场景（容器日志文本、离线安装上传等）。
 */
export function rawFetch(
  path: string,
  options: {
    method?: string
    body?: BodyInit
    headers?: Record<string, string>
    isFormData?: boolean
  } = {},
): Promise<Response> {
  const user = getConfig().user
  const headers: Record<string, string> = { ...(options.headers || {}) }
  if (user?.token && !headers['Authorization']) {
    headers['Authorization'] = user.token
  }
  if (!options.isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(path, { method: options.method || 'GET', body: options.body, headers })
}
