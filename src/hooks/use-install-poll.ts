import { useEffect, useState } from 'react'
import { installInfo, type InstallInfo } from '@/lib/api/service-api'

export type InstallStage = 'download' | 'install' | 'run' | 'done' | 'error'

/**
 * 轮询安装/升级进度（GET api/installInfo/{id}，默认 1s）。
 * 返回当前阶段与进度数据，done/error 后停止轮询。
 */
export function useInstallPoll(id: string | null, intervalMs = 1000) {
  const [info, setInfo] = useState<InstallInfo | null>(null)
  const [stage, setStage] = useState<InstallStage>('download')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let alive = true
    const tick = async () => {
      try {
        const res = await installInfo(id)
        if (!alive) return
        setInfo(res)

        const err = (['run', 'install', 'download'] as const)
          .map((k) => res[k]?.err)
          .find(Boolean)
        if (err) {
          setStage('error')
          setError(err)
          return
        }
        if (res.run?.progress === 100) {
          setStage('done')
          return
        }
        if (res.run) setStage('run')
        else if (res.install) setStage('install')
        else setStage('download')
      } catch (e) {
        if (alive) {
          setStage('error')
          setError(String(e))
        }
      }
    }
    tick()
    const timer = setInterval(tick, intervalMs)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [id, intervalMs])

  return { info, stage, error }
}

/** 阶段显示名 */
export const STAGE_LABEL: Record<InstallStage, string> = {
  download: '正在下载',
  install: '正在安装',
  run: '正在启动',
  done: '已完成',
  error: '失败',
}
