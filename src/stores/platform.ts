import { atom, getDefaultStore } from 'jotai'

const store = getDefaultStore()
import { getServerInfo, getRepos, type ServerInfo, type RepoInfo, type RepoRelease } from '@/lib/api/server-api'

/** 平台服务器信息（GET api/server/info），决定 url1~url4 与服务资源路径 */
export const serverInfoAtom = atom<ServerInfo | null>(null)

/** 服务/模块最新版本仓库列表（GET {repos}） */
export const newVersionsAtom = atom<RepoInfo[]>([])

export const setServerInfo = (info: ServerInfo) => store.set(serverInfoAtom, info)
export const setNewVersions = (repos: RepoInfo[]) => store.set(newVersionsAtom, repos)

export type PlatformUrls = { url1: string; url2: string; url3: string; url4: string }

/** 依据 serverType 推导 url1~url4（与旧版 index.js 一致） */
export function getUrls(info: ServerInfo | null): PlatformUrls {
  const t = info?.serverType
  if (t === 'windows') return { url1: 'win', url2: 'win/pg', url3: 'win/proc', url4: 'win/offlineInstall' }
  if (t === 'k3s' || t === 'k8s') return { url1: 'k8s', url2: 'k8s', url3: 'k8s', url4: 'k8s/offlineInstall' }
  return { url1: 'docker', url2: 'docker/compose', url3: 'docker/containers', url4: 'docker/install' }
}

/** 服务列表资源路径 */
export function getServiceResource(info: ServerInfo | null): string {
  const t = info?.serverType
  if (t === 'windows') return 'api/win/pg/service'
  if (t === 'k3s' || t === 'k8s') return 'api/k8s/service'
  return 'api/docker/compose/service'
}

/** 按 repo 名（和可选分组）查找最新 release */
export function findRelease(repos: RepoInfo[], repoName?: string, group?: string): RepoRelease | undefined {
  return repos.find((r) => r.repo_name === repoName && (!group || r.group_name === group))?.releases?.[0]
}

/** 从 release 中挑选符合当前服务器架构的安装包地址 */
export function getPackageUrl(serverInfo: ServerInfo | null, release?: RepoRelease): string | undefined {
  if (!serverInfo || !release?.assets?.length) return undefined
  const assets = release.assets
  const OS = serverInfo.operatingSystem
  const arch = serverInfo.architecture
  const t = serverInfo.serverType
  const find = (kw: string) => assets.find((a) => a.url.includes(kw))?.url

  if (OS === 'windows') return find('.zip')
  if (t === 'windows') {
    if (OS === 'linux') return find('linux-x86_64-binary.tar.gz') || find('linux-aarch64-binary.tar.gz')
    if (OS === 'darwin') return find('darwin-x86_64-binary.tar.gz') || find('darwin-aarch64-binary.tar.gz')
  }
  if (t === 'loong64') return find('loong64.tar.gz')
  if (OS === 'linux' || OS === 'darwin') {
    if (arch === 'aarch64') return find('aarch64.tar.gz')
    return find('x86_64.tar.gz')
  }
  return undefined
}

/** 启动时加载平台信息与版本仓库（旧版 bootstrap 逻辑） */
export async function bootstrapPlatform(): Promise<void> {
  try {
    const info = await getServerInfo()
    setServerInfo(info)
    if (info.repos) {
      const repos = await getRepos(info.repos)
      setNewVersions(repos)
    }
  } catch {
    // 服务器信息加载失败时保持默认（docker），不阻塞进入应用
  }
}
