import { apiClient, frontAPI, asJson, asArray } from './client'

/** 前端模块条目（api/front） */
export interface ModularItem {
  id?: string
  name?: string
  modTime?: string | number
  description?: string
  descriptionEn?: string
  version?: string
  dependencies?: string[]
  newVersion?: string
  item?: any
  groupName?: string
  [key: string]: any
}

/** 模块列表：GET api/front */
export async function listModulars(): Promise<ModularItem[]> {
  return asArray<ModularItem>(await frontAPI.fetch(''))
}

/** 删除模块：DELETE api/front?packageName={name}[&groupName=...] */
export async function removeModular(name: string, groupName?: string): Promise<void> {
  const qs = new URLSearchParams({ packageName: name })
  if (groupName) qs.set('groupName', groupName)
  await apiClient.fetch(`/front?${qs.toString()}`, { method: 'DELETE' })
}

/** 模块在线安装：POST api/front/onlineInstall（iot-maintain 走 Operation） */
export async function modularOnlineInstall(url: string, isMaintain = false): Promise<{ id: string }> {
  const path = isMaintain ? '/front/onlineInstallOperation' : '/front/onlineInstall'
  return asJson<{ id: string }>(await apiClient.fetch(path, { method: 'POST', data: { url } }))
}
