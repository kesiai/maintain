import { useMemo } from 'react'

import { LogViewer, type LogQuery } from '@/components/common/LogViewer'
import { rawLogs } from '@/lib/api/service-api'

/** 服务管理日志（pm2）：GET api/win/logs/pm2 */
export default function Pm2LogPage() {
  const fetchLogs = useMemo(() => (p: LogQuery) => rawLogs('win/logs/pm2', { tail: p.tail }), [])

  return <LogViewer title="服务管理日志" fetchLogs={fetchLogs} showAdvanced={false} />
}
