import { apiClient, asJson } from './client'

export type ServerType = 'docker' | 'windows' | 'k3s' | 'k8s' | 'loong64'

/** GET api/server/info —— 平台类型/能力开关，决定 url1~url4 与服务资源 */
export interface ServerInfo {
  online?: boolean
  serverType?: ServerType
  operatingSystem?: string
  architecture?: string
  liteMode?: boolean
  canNotDeleteServices?: string[]
  repos?: string
  [key: string]: any
}

/** 版本仓库（strapi feed）：GET {serverInfo.repos} */
export interface RepoAsset {
  url: string
  name?: string
}
export interface RepoRelease {
  tag_name: string
  create_time?: string
  description?: string
  assets?: RepoAsset[]
}
export interface RepoInfo {
  group_name?: string
  repo_name?: string
  releases?: RepoRelease[]
}

/** 系统资源信息：GET api/systemInfo */
export interface SystemMem {
  total?: number
  used?: number
  free?: number
  available?: number
  /** 磁盘文件系统使用量 */
  size?: number
  avail?: number
  shared?: number
  bufferCache?: number
  rate?: number
  unit?: string
}
export interface SystemInfo {
  mem?: Record<string, SystemMem>
  cpu?: {
    num?: number
    rate?: number
    load1?: number
    load1Rate?: number
    load5?: number
    load5Rate?: number
    load15?: number
    load15Rate?: number
  }
  filesystem?: Array<SystemMem & { mountpoint?: string }>
}

export async function getServerInfo(): Promise<ServerInfo> {
  const res = await apiClient.fetch('/server/info')
  return asJson<ServerInfo>(res)
}

export async function getRepos(url?: string): Promise<RepoInfo[]> {
  if (!url) return []
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return []
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const res = await apiClient.fetch('/systemInfo')
  return asJson<SystemInfo>(res)
}
