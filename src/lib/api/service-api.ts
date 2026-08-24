import { getDefaultStore } from 'jotai'

const store = getDefaultStore()
import { apiClient, asJson, asArray, rawFetch } from './client'
import { serverInfoAtom, getUrls, getServiceResource } from '@/stores/platform'
import i18n from '@/i18n'

/** 服务条目（docker compose / k8s / win service） */
export interface ServiceItem {
  name?: string
  state?: string
  createTime?: number
  image?: string | { Name?: string; Tag?: string }
  port?: string
  version?: string
  dependencies?: string[]
  newVersion?: string
  repo?: string
  id?: string
  [key: string]: any
}

export interface InstallProgress {
  progress?: number
  err?: string
  outInfo?: string
}
export interface InstallInfo {
  run?: InstallProgress
  install?: InstallProgress
  download?: InstallProgress
}

function ctx() {
  const info = store.get(serverInfoAtom)
  return { info, urls: getUrls(info), resource: getServiceResource(info) }
}

const url = (p: string, options?: Parameters<typeof apiClient.fetch>[1]) => apiClient.fetch(p, options)

/* ---------------- 服务列表 CRUD ---------------- */

/** 服务列表：GET api/{url2}/service */
export async function listServices(): Promise<ServiceItem[]> {
  const { urls } = ctx()
  return asArray<ServiceItem>(await url(`/${urls.url2}/service`))
}

/** 创建服务：POST api/{url2}/service */
export async function createService(data: Record<string, any>): Promise<ServiceItem> {
  const { urls } = ctx()
  return asJson<ServiceItem>(await url(`/${urls.url2}/service`, { method: 'POST', data }))
}

/** 修改服务：PUT api/{url2}/service/{name} */
export async function updateService(name: string, data: Record<string, any>): Promise<ServiceItem> {
  const { urls } = ctx()
  return asJson<ServiceItem>(await url(`/${urls.url2}/service/${encodeURIComponent(name)}`, { method: 'PUT', data }))
}

/** 删除服务：DELETE api/{url2}/service/{name} */
export async function removeService(name: string): Promise<void> {
  const { urls } = ctx()
  await url(`/${urls.url2}/service/${encodeURIComponent(name)}`, { method: 'DELETE' })
}

/* ---------------- 列表级操作 ---------------- */

/** 全部服务操作：POST api/{url2}/{action}  start/restart/stop/up */
export async function composeAction(action: 'start' | 'restart' | 'stop' | 'up'): Promise<void> {
  const { urls } = ctx()
  await url(`/${urls.url2}/${action}`, { method: 'POST' })
}

/** 容器级操作：POST api/{url3}/{id}/{action} */
export async function containerAction(id: string, action: string): Promise<void> {
  const { urls } = ctx()
  await url(`/${urls.url3}/${encodeURIComponent(id)}/${action}`, { method: 'POST' })
}

/* ---------------- 安装 / 升级 ---------------- */

/** 在线安装：POST api/{url1}/onlineInstall { url } → { id } */
export async function onlineInstall(pkgUrl: string): Promise<{ id: string }> {
  const { urls } = ctx()
  const res = await url(`/${urls.url1}/onlineInstall`, { method: 'POST', data: { url: pkgUrl } })
  return asJson<{ id: string }>(res)
}

/** 安装进度轮询：GET api/installInfo/{id} */
export async function installInfo(id: string): Promise<InstallInfo> {
  return asJson<InstallInfo>(await url(`/installInfo/${id}`))
}

/* ---------------- 部署文件（yml） ---------------- */

/** GET api/{url2}/yml —— 原始 YAML 文本 */
export async function getYml(): Promise<string> {
  const { urls } = ctx()
  const res = await rawFetch(`/api/${urls.url2}/yml`)
  return res.text()
}

/** POST api/{url2}/yml —— 保存原始 YAML 文本 */
export async function saveYml(text: string): Promise<void> {
  const { urls } = ctx()
  const res = await rawFetch(`/api/${urls.url2}/yml`, {
    method: 'POST',
    body: text,
    headers: { 'Content-Type': 'text/plain' },
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || i18n.t('保存失败'))
  }
}

/* ---------------- 容器镜像 ---------------- */

/** 镜像列表：GET api/docker/image/repoTags */
export async function imageRepoTags(): Promise<string[]> {
  return asArray<string>(await url('/docker/image/repoTags'))
}

/* ---------------- 容器诊断 ---------------- */

/** 容器统计：GET api/docker/containers/{pod}/stats */
export async function containerStats(pod: string): Promise<any> {
  return asJson<any>(await url(`/docker/containers/${encodeURIComponent(pod)}/stats`))
}

/** 容器检查：GET api/docker/containers/{pod} */
export async function containerInspect(pod: string): Promise<any> {
  return asJson<any>(await url(`/docker/containers/${encodeURIComponent(pod)}`))
}

/** 执行命令：POST api/docker/containers/{pod}/exec → { Id } */
export async function containerExec(
  pod: string,
  body: { attachStderr?: boolean; attachStdin?: boolean; attachStdout?: boolean; cmd: string[]; tty?: boolean; user?: string },
): Promise<{ Id: string }> {
  const res = await url(`/docker/containers/${encodeURIComponent(pod)}/exec`, { method: 'POST', data: body })
  return asJson<{ Id: string }>(res)
}

/** Windows 进程性能：GET api/win/proc/{pod}/pref */
export async function winPref(pod: string): Promise<{ memory?: number; rss?: number; pcpu?: number }> {
  return asJson<any>(await url(`/win/proc/${encodeURIComponent(pod)}/pref`))
}

/* ---------------- 日志（原始文本，走 rawFetch） ---------------- */

/** 容器日志：GET api/{url3}/{pod}/logs?timestamps&since&tail&refresh */
export async function containerLogs(
  pod: string,
  params: { timestamps?: boolean; since?: number; tail?: number; refresh?: boolean },
): Promise<string> {
  const { urls } = ctx()
  const qs = new URLSearchParams()
  if (params.timestamps != null) qs.set('timestamps', String(params.timestamps))
  if (params.since != null) qs.set('since', String(params.since))
  if (params.tail != null) qs.set('tail', String(params.tail))
  if (params.refresh != null) qs.set('refresh', String(params.refresh))
  const res = await rawFetch(`/api/${urls.url3}/${encodeURIComponent(pod)}/logs?${qs.toString()}`)
  return res.text()
}

/** 自定义日志源（运维日志 / 服务管理日志），undefined 参数会被忽略 */
export async function rawLogs(path: string, params: Record<string, string | number | undefined> = {}): Promise<string> {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][]
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))
  const q = qs.toString()
  const res = await rawFetch(`/api/${path}${q ? `?${q}` : ''}`)
  return res.text()
}

/** 导出日志为 Blob，undefined 参数会被忽略 */
export async function downloadLogBlob(path: string, params: Record<string, string | number | undefined> = {}): Promise<Blob> {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][]
  const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))
  const q = qs.toString()
  const res = await rawFetch(`/api/${path}${q ? `?${q}` : ''}`)
  return res.blob()
}
