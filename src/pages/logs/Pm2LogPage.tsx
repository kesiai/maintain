import { useMemo } from 'react'
import { useAtomValue } from 'jotai'
import { AlertCircle } from 'lucide-react'

import { LogViewer, type LogQuery } from '@/components/common/LogViewer'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { rawLogs } from '@/lib/api/service-api'
import { serverInfoAtom } from '@/stores/platform'

/** 服务管理日志（pm2）：GET api/win/logs/pm2，仅 Windows 服务器提供该接口 */
export default function Pm2LogPage() {
  const serverInfo = useAtomValue(serverInfoAtom)
  const isWindows = serverInfo?.serverType === 'windows'

  const fetchLogs = useMemo(() => (p: LogQuery) => rawLogs('win/logs/pm2', { tail: p.tail }), [])

  // 非 Windows 服务器没有 /win/logs/pm2 接口（旧版 MainMenu 同样只在 Windows 显示该菜单）
  if (!isWindows) {
    return (
      <div className="space-y-4">
        <PageHeader title="服务管理日志" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <AlertCircle className="size-4 shrink-0" />
            服务管理日志（PM2）仅支持 Windows 服务器，当前服务器类型：{serverInfo?.serverType ?? '未知'}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <LogViewer title="服务管理日志" fetchLogs={fetchLogs} showAdvanced={false} />
}
