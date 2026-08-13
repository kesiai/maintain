import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Activity, ListChecks, RefreshCw, Terminal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { listServices, type ServiceItem } from '@/lib/api/service-api'
import { getImageText } from '@/lib/api/service-utils'

const NON_RUNNING = ['dead', 'fatal', 'error', 'failed', 'stopped', 'stopping', 'exited', 'terminating', 'pending', 'paused']

export default function ServiceDiagnosisPage() {
  const [items, setItems] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listServices())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '获取服务列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const abnormal = useMemo(() => {
    return items.filter((s) => {
      const st = String(s.state || '').toLowerCase()
      return NON_RUNNING.includes(st)
    })
  }, [items])

  const columns: Column<ServiceItem>[] = [
    {
      key: 'name',
      title: '服务名称',
      width: 200,
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'state',
      title: '状态',
      width: 120,
      render: (r) => <StatusBadge state={String(r.state || '')} />,
    },
    {
      key: 'image',
      title: '镜像',
      render: (r) => {
        const img = getImageText(r.image)
        return img ? <span className="text-muted-foreground">{img}</span> : '-'
      },
    },
    {
      key: 'createTime',
      title: '创建时间',
      width: 180,
      render: (r) =>
        r.createTime ? new Date(r.createTime).toLocaleString('zh-CN', { hour12: false }) : '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (r) => {
        const pod = r.name || ''
        return (
          <div className="flex items-center gap-1">
            <Link to={`/app/model/Service/log?podName=${encodeURIComponent(pod)}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ListChecks className="mr-1 size-3.5" />
                日志
              </Button>
            </Link>
            <Link to={`/app/model/Service/stats?podName=${encodeURIComponent(pod)}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Activity className="mr-1 size-3.5" />
                图表
              </Button>
            </Link>
            <Link to={`/app/model/Service/console?podName=${encodeURIComponent(pod)}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Terminal className="mr-1 size-3.5" />
                控制台
              </Button>
            </Link>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="服务诊断"
        subtitle="展示当前未正常运行的服务，便于快速定位问题"
        extra={
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="刷新">
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{abnormal.length}</Badge>
            <span className="text-sm text-muted-foreground">个异常服务</span>
          </div>
          <DataTable
            columns={columns}
            data={abnormal}
            rowKey={(r) => r.name || r.id || ''}
            loading={loading}
            pagination={{ pageSize: 10 }}
            emptyText="所有服务均正常运行"
          />
        </CardContent>
      </Card>
    </div>
  )
}
