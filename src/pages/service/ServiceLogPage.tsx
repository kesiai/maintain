import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'

import { LogViewer, type LogQuery } from '@/components/common/LogViewer'
import { serverInfoAtom, getUrls } from '@/stores/platform'
import { containerLogs, downloadLogBlob } from '@/lib/api/service-api'

/** 服务日志内容（供页面 / 操作对话框复用）。 */
export function ServiceLogContent({ pod, back = false }: { pod: string; back?: boolean }) {
  const { t } = useTranslation()
  const serverInfo = useAtomValue(serverInfoAtom)
  const urls = getUrls(serverInfo)
  const isWin = serverInfo?.serverType === 'windows'

  const fetchLogs = useMemo(
    () => (p: LogQuery) => containerLogs(pod, p),
    [pod],
  )

  const exportLogs = useMemo(() => {
    if (!pod) return undefined
    const base = isWin ? `win/proc/${pod}/downloadLog` : `${urls.url3}/${pod}/downloadLog`
    return (p: { since?: number; tail?: number }) => downloadLogBlob(base, { since: p.since, tail: p.tail })
  }, [pod, isWin, urls])

  return (
    <LogViewer
      title={t('服务日志')}
      back={back}
      fetchLogs={fetchLogs}
      exportLogs={exportLogs}
      exportName={`${pod || 'service'}.zip`}
      showAdvanced={!isWin}
    />
  )
}

export default function ServiceLogPage() {
  const [params] = useSearchParams()
  const pod = params.get('podName') || ''
  return <ServiceLogContent pod={pod} back />
}
