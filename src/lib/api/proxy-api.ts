import { apiClient, asJson, rawFetch } from './client'

export interface ProxyConfig {
  targetIp?: string
  targetPort?: string
  serverPort?: string
  vkey?: string
  valid?: boolean
}

/** 探测网络：GET api/proxy/ping */
export async function proxyPing(): Promise<{ internetAccess?: boolean; platform?: string }> {
  return asJson<any>(await apiClient.fetch('/proxy/ping'))
}

/** 获取配置：GET api/proxy/config */
export async function getProxyConfig(): Promise<ProxyConfig> {
  return asJson<ProxyConfig>(await apiClient.fetch('/proxy/config'))
}

/** 保存配置：POST api/proxy/config */
export async function saveProxyConfig(body: Record<string, any>): Promise<ProxyConfig> {
  return asJson<ProxyConfig>(await apiClient.fetch('/proxy/config', { method: 'POST', data: body }))
}

/** 启动：POST api/proxy/start */
export async function startProxy(): Promise<void> {
  await apiClient.fetch('/proxy/start', { method: 'POST' })
}

/** 停止：POST api/proxy/stop */
export async function stopProxy(): Promise<void> {
  await apiClient.fetch('/proxy/stop', { method: 'POST' })
}

/** 下载客户端：GET api/proxy/download?platform= */
export async function downloadClient(platform?: string): Promise<Blob> {
  const qs = platform ? `?platform=${encodeURIComponent(platform)}` : ''
  const res = await rawFetch(`/api/proxy/download${qs}`)
  return res.blob()
}
