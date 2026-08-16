import { useMemo } from 'react'
import { useAtomValue } from 'jotai'

import { LogViewer, type LogQuery } from '@/components/common/LogViewer'
import { serverInfoAtom } from '@/stores/platform'
import { rawLogs } from '@/lib/api/service-api'

/** 运维日志：linux → docker/containers/operationLogs/info；windows → win/logs/operation */
export default function OpsLogPage() {
  const serverInfo = useAtomValue(serverInfoAtom)
  const path = serverInfo?.serverType === 'windows' ? 'win/logs/operation' : 'docker/containers/operationLogs/info'

  const fetchLogs = useMemo(
    () => (p: LogQuery) =>
      rawLogs(path, {
        timestamps: p.timestamps != null ? String(p.timestamps) : undefined,
        tail: p.tail,
        since: p.since,
      }),
    [path],
  )

  return <LogViewer title="运维日志" fetchLogs={fetchLogs} boxClassName="min-h-[420px] h-[calc(100vh-230px)]" />
}
