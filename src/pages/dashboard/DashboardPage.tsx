import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Box, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { EChartsOption } from 'echarts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/common/DataTable'
import { EChart } from '@/components/common/EChart'
import { PageHeader } from '@/components/common/PageHeader'
import { listServices, type ServiceItem } from '@/lib/api/service-api'
import { listModulars, type ModularItem } from '@/lib/api/modular-api'
import { getUpdateLogs, type UpdateLogItem } from '@/lib/api/log-api'


export default function DashboardPage() {
  const { t } = useTranslation()

  const [services, setServices] = useState<ServiceItem[]>([])
  const [modulars, setModulars] = useState<ModularItem[]>([])
  const [logs, setLogs] = useState<UpdateLogItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [svc, mod, log] = await Promise.all([listServices(), listModulars(), getUpdateLogs()])
      setServices(svc)
      setModulars(mod)
      setLogs(log)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('加载首页数据失败'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const running = useMemo(() => services.filter((s) => s.state === 'running').length, [services])

  const pieOption: EChartsOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{b}: {c}' },
          data: [
            { name: t('运行'), value: running, itemStyle: { color: '#3b82f6' } },
            { name: t('停止'), value: services.length - running, itemStyle: { color: '#d4d4d8' } },
          ],
        },
      ],
    }),
    [running, services.length, t],
  )

  const serviceLogs = useMemo(
    () => logs.filter((l) => l.group === 'server' || l.group === 'driver'),
    [logs],
  )

  return (
    <div className="space-y-2 sm:space-y-4">
      <PageHeader
        title={t('首页')}
        extra={
          <>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </>
        }
      />

      <div className="grid gap-2 sm:gap-4 sm:grid-cols-2">
        <Link to="/app/model/Service/list" className="block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('服务总数')}</CardTitle>
              <Box className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '…' : services.length}</div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('服务状态')}</CardTitle>
            <Box className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : `${running} / ${services.length}`}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('服务状态分布')}</CardTitle>
            <CardDescription>{t('当前运行 / 停止服务数')}</CardDescription>
          </CardHeader>
          <CardContent>
            <EChart option={pieOption} height={260} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('更新日志')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LogTable logs={serviceLogs} loading={loading} />
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

function LogTable({ logs, loading }: { logs: UpdateLogItem[]; loading: boolean }) {
  const { t } = useTranslation()
  const columns: Column<UpdateLogItem>[] = [
    { key: 'name', title: t('名称') },
    {
      key: 'time',
      title: t('更新时间'),
      render: (l) =>
        l.time ? new Date(l.time).toLocaleString('zh-CN', { hour12: false }) : '-',
    },
    { key: 'msg', title: t('更新信息'), render: (l) => <div className="max-w-40 truncate">{l.msg}</div> },
    { key: 'version', title: t('版本') },
  ]
  return (
    <div className="max-h-72 overflow-hidden rounded-md border">
      <DataTable
        columns={columns}
        data={logs}
        rowKey={(l) => `${l.name}-${l.version}-${l.time ?? ''}-${l.msg ?? ''}`}
        loading={loading}
        emptyText={t('暂无更新日志')}
      />
    </div>
  )
}
