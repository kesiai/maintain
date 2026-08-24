import { rawFetch } from './client'
import i18n from '@/i18n'

/**
 * 通用 multipart 上传：POST /api/{path}，FormData('file', file)，
 * 可附带额外字段（如 name）。适用于 createAPI 强制 JSON 之外的场景。
 */
export async function upload(
  path: string,
  file: File,
  fields: Record<string, string> = {},
): Promise<any> {
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)

  const res = await rawFetch(`/api/${path}`, { method: 'POST', body: fd, isFormData: true })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const e = new Error(text || i18n.t('上传失败（{{status}}）', { status: res.status })) as Error & { status?: number }
    e.status = res.status
    throw e
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return await res.json()
  return {}
}

/** 服务离线安装：POST api/{url4} */
export function offlineInstallService(url4: string, file: File, fields?: Record<string, string>) {
  return upload(url4, file, fields)
}

/** 模块离线安装：POST api/front/install（iot-maintain 走 installOperation） */
export function offlineInstallFront(file: File, isMaintain = false) {
  return upload(isMaintain ? 'front/installOperation' : 'front/install', file)
}

/** 离线上传驱动：POST api/driver / api/k8s/upload/driver */
export function uploadDriver(file: File, k8s = false) {
  return upload(k8s ? 'k8s/upload/driver' : 'driver', file)
}

/** 离线上传代理服务：POST api/backend/protocolProxy/upload */
export function uploadProtocolProxy(file: File) {
  return upload('backend/protocolProxy/upload', file)
}

/** 离线上传数据中转协议：POST api/backend/dataRelay/upload */
export function uploadDataRelay(file: File) {
  return upload('backend/dataRelay/upload', file)
}

/** 上传镜像：POST api/docker/image/load / api/oci/registry/image */
export function uploadImage(file: File, k8s = false) {
  return upload(k8s ? 'oci/registry/image' : 'docker/image/load', file)
}

/** 一键离线升级：POST api/batchUpgrade/offlineInstall */
export function batchUpgrade(file: File) {
  return upload('batchUpgrade/offlineInstall', file)
}

/** 项目 loading CSS：POST（有文件） / DELETE（无文件）api/front/loadingCss */
export async function saveLoadingCss(file?: File | null): Promise<void> {
  if (file) {
    await upload('front/loadingCss', file)
  } else {
    await rawFetch('/api/front/loadingCss', { method: 'DELETE', isFormData: true })
  }
}
