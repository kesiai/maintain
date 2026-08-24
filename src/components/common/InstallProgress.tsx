import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { STAGE_LABEL, type InstallStage } from '@/hooks/use-install-poll'
import type { InstallInfo } from '@/lib/api/service-api'

/** 安装/升级进度展示（download/install/run 三阶段） */
export function InstallProgressView({
  info,
  stage,
  className,
}: {
  info: InstallInfo | null
  stage: InstallStage
  className?: string
}) {
  const isTerminal = stage === 'done' || stage === 'error'
  const { t } = useTranslation()
  const progress = info
    ? isTerminal
      ? info.run?.progress ?? 0
      : info[stage]?.progress ?? info.run?.progress ?? 0
    : 0
  const done = stage === 'done'
  const error = stage === 'error'

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className={cn(error && 'text-destructive', done && 'text-emerald-600')}>
          {t(STAGE_LABEL[stage])}
        </span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress
        value={progress}
        className={cn(error && '[&>div]:bg-destructive', done && '[&>div]:bg-emerald-500')}
      />
    </div>
  )
}
