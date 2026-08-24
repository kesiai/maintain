import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

/** 服务状态 → 样式映射（docker/k8s/win 兼容）；label 即 i18n key（中文原文） */
const STATE_MAP: Record<string, { label: string; cls: string }> = {
  running: { label: '运行', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  exited: { label: '停止', cls: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30' },
  stop: { label: '停止', cls: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30' },
  stopped: { label: '停止', cls: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30' },
  created: { label: '已创建', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  paused: { label: '暂停', cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  restarting: { label: '重启中', cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  dead: { label: '启动失败', cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  fatal: { label: '启动失败', cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  start: { label: '启动', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  removing: { label: '正在删除', cls: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30' },
  stopping: { label: '停止中', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  'retry wait': { label: '等待重试', cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
}

export function StatusBadge({ state }: { state?: string }) {
  const s = state || ''
  const { t } = useTranslation()
  const conf = STATE_MAP[s] || { label: s || '未知', cls: 'bg-muted text-muted-foreground border-border' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        conf.cls,
      )}
    >
      {t(conf.label)}
    </span>
  )
}
