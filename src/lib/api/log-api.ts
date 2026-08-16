import { opsLogAPI, logCycleAPI, apiClient, asJson, asArray } from './client'

/** 操作日志条目（api/opsLog） */
export interface OpsLogItem {
  id?: string
  time?: string | number
  type?: string
  ip?: string
  message?: string
  oldData?: any
  data?: any
  [key: string]: any
}

/** 操作日志分页查询：GET api/opsLog?query=... */
export async function queryOpsLogs(
  filter: { order?: Record<string, 'ASC' | 'DESC'>; skip?: number; limit?: number; fields?: string[]; [key: string]: any },
  where?: Record<string, any>,
): Promise<{ items: OpsLogItem[]; total: number }> {
  // createAPI 的 where 需以数组形式传入（内部按 Object.values 展开），否则字段名层会被丢弃
  const wheres = { where }
  const { items, total } = await opsLogAPI.query(filter, wheres, true)
  return { items: items as OpsLogItem[], total }
}

/** 日志清理周期（api/logCycle） */
export interface LogCycleItem {
  id?: string
  name?: string
  type?: string
  cycle?: number
  cycle_type?: string
  time_config?: any
  duration?: number
  disabled?: boolean
  [key: string]: any
}

export async function queryLogCycles(): Promise<LogCycleItem[]> {
  const res = await logCycleAPI.fetch(
    `?query=${encodeURIComponent(JSON.stringify({ limit: 30, skip: 0, sort: { createTime: -1 }, withCount: true }))}`,
  )
  return asArray<LogCycleItem>(res)
}

export async function getLogCycle(id: string): Promise<LogCycleItem> {
  return asJson<LogCycleItem>(await logCycleAPI.fetch(`/${id}`))
}

export async function createLogCycle(data: Record<string, any>): Promise<LogCycleItem> {
  return asJson<LogCycleItem>(await logCycleAPI.fetch('', { method: 'POST', data }))
}

export async function updateLogCycle(id: string, data: Record<string, any>): Promise<LogCycleItem> {
  return asJson<LogCycleItem>(await logCycleAPI.fetch(`/${id}`, { method: 'PATCH', data }))
}

export async function removeLogCycle(id: string): Promise<void> {
  await logCycleAPI.fetch(`/${id}`, { method: 'DELETE' })
}

/** 一键清除日志：POST api/logCycle/execOnce */
export async function execOnceLogClear(data: Record<string, any>): Promise<void> {
  await apiClient.fetch('/logCycle/execOnce', { method: 'POST', data })
}

/** 当前用户信息：GET api/current/user（含 logQueryTime） */
export async function getCurrentUser(): Promise<any> {
  return asJson<any>(await apiClient.fetch('/current/user'))
}

/** 更新日志（首页）：GET api/log */
export interface UpdateLogItem {
  name?: string
  time?: string | number
  msg?: string
  version?: string
  group?: string
  [key: string]: any
}
export async function getUpdateLogs(): Promise<UpdateLogItem[]> {
  return asArray<UpdateLogItem>(await apiClient.fetch('/log'))
}

/** 更新用户（语言 / logQueryTime）：PATCH api/user */
export async function updateUser(body: Record<string, any>): Promise<any> {
  return asJson<any>(await apiClient.fetch('/user', { method: 'PATCH', data: body }))
}
