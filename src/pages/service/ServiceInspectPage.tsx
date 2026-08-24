import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { containerInspect } from '@/lib/api/service-api'

/** 容器检查内容（供页面 / 操作对话框复用）。 */
export function ServiceInspectContent({ pod, back = false }: { pod: string; back?: boolean }) {
  const { t } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'tree' | 'doc'>('tree')

  const load = async () => {
    setLoading(true)
    try {
      setData(await containerInspect(pod))
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取容器信息失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pod) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod])

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('容器检查：{{pod}}', { pod })}
        back={back}
        extra={
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <Tabs value={view} onValueChange={(v) => setView(v as 'tree' | 'doc')}>
            <TabsList>
              <TabsTrigger value="tree">{t('树状形式')}</TabsTrigger>
              <TabsTrigger value="doc">{t('文档形式')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-4">
            {loading ? (
              <p className="text-muted-foreground">{t('加载中...')}</p>
            ) : view === 'tree' ? (
              <TreeView data={data} />
            ) : (
              <pre className="text-xs leading-5">{JSON.stringify(data, null, 2)}</pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ServiceInspectPage() {
  const [params] = useSearchParams()
  const pod = params.get('podName') || ''
  return <ServiceInspectContent pod={pod} back />
}

function TreeView({ data }: { data: any }) {
  if (data == null) return <span className="text-muted-foreground">null</span>
  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[ ]</span>
    return (
      <details open>
        <summary className="cursor-pointer">[{data.length}]</summary>
        <div className="ml-4">
          {data.map((item, i) => (
            <div key={i} className="my-0.5">
              {item && typeof item === 'object' ? <TreeView data={item} /> : <span>{String(item)}</span>}
            </div>
          ))}
        </div>
      </details>
    )
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return <span>{'{ }'}</span>
    return (
      <ul className="space-y-1">
        {entries.map(([k, v]) => (
          <li key={k}>
            {v && typeof v === 'object' ? (
              <details>
                <summary className="cursor-pointer">{k}</summary>
                <div className="ml-4">
                  <TreeView data={v} />
                </div>
              </details>
            ) : (
              <span>
                <span className="text-muted-foreground">{k}：</span>
                {String(v)}
              </span>
            )}
          </li>
        ))}
      </ul>
    )
  }
  return <span>{String(data)}</span>
}
