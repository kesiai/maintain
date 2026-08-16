import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { Box, RefreshCw, Rocket, UploadCloud } from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/common/DataTable'
import { EChart } from '@/components/common/EChart'
import { PageHeader } from '@/components/common/PageHeader'
import { serverInfoAtom, newVersionsAtom, findRelease, getPackageUrl } from '@/stores/platform'
import { listServices, type ServiceItem } from '@/lib/api/service-api'
import { listModulars, type ModularItem } from '@/lib/api/modular-api'
import { getUpdateLogs, type UpdateLogItem } from '@/lib/api/log-api'
import { onlineInstall, installInfo } from '@/lib/api/service-api'
import { modularOnlineInstall } from '@/lib/api/modular-api'
import { batchUpgrade } from '@/lib/api/upload-api'
import { UploadFileButton } from '@/components/common/UploadFileButton'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function pollInstall(id: string, onProgress: (percent: number) => void) {
  for (;;) {
    const info = await installInfo(id)
    const err = (['run', 'install', 'download'] as const).map((k) => info[k]?.err).find(Boolean)
    if (err) throw new Error(err)
    const p = info.run?.progress ?? info.install?.progress ?? info.download?.progress ?? 0
    onProgress(p)
    if (info.run?.progress === 100) return
    await sleep(2000)
  }
}

export default function DashboardPage() {
  const serverInfo = useAtomValue(serverInfoAtom)
  const repos = useAtomValue(newVersionsAtom)

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
      toast.error(e?.json?._error || e?.message || '加载首页数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

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
            { name: '运行', value: running, itemStyle: { color: '#3b82f6' } },
            { name: '停止', value: services.length - running, itemStyle: { color: '#d4d4d8' } },
          ],
        },
      ],
    }),
    [running, services.length],
  )

  const serviceLogs = useMemo(
    () => logs.filter((l) => l.group === 'server' || l.group === 'driver'),
    [logs],
  )

  const [upgrading, setUpgrading] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePercent, setUpgradePercent] = useState(0)
  const [upgradeText, setUpgradeText] = useState('')

  const handleOnlineUpgrade = async () => {
    setUpgradeOpen(true)
    setUpgrading(true)
    setUpgradePercent(0)
    try {
      let done = 0
      const targets: Array<{ name: string; url?: string; isModular?: boolean; isMaintain?: boolean }> = []
      for (const svc of services) {
        const rel = findRelease(repos, svc.repo) || findRelease(repos, svc.repo, 'server') || findRelease(repos, svc.repo, 'driver')
        if (rel && rel.tag_name !== svc.version) {
          targets.push({ name: svc.name || '', url: getPackageUrl(serverInfo, rel) })
        }
      }
      for (const mod of modulars) {
        const rel = findRelease(repos, mod.id)
        if (rel && rel.tag_name !== `v${mod.version}`) {
          targets.push({
            name: mod.name || mod.id || '',
            url: rel.assets?.[0]?.url,
            isModular: true,
            isMaintain: (mod.id || '').includes('iot-maintain'),
          })
        }
      }
      if (targets.length === 0) {
        toast.info('已是最新版本')
        return
      }
      for (const t of targets) {
        setUpgradeText(`正在升级 ${t.name}...`)
        if (!t.url) continue
        const { id } = t.isModular
          ? await modularOnlineInstall(t.url, t.isMaintain)
          : await onlineInstall(t.url)
        await pollInstall(id, (p) => {
          const base = (done / targets.length) * 100
          setUpgradePercent(base + p / targets.length)
        })
        done += 1
        setUpgradePercent((done / targets.length) * 100)
      }
      toast.success('在线升级完成')
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '在线升级失败')
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="首页"
        extra={
          <>
            <UploadFileButton
              label="一键离线升级"
              accept=".gz,.zip"
              icon={<UploadCloud className="mr-1 size-4" />}
              onUpload={async (file) => {
                await batchUpgrade(file)
                toast.success('离线升级已提交')
              }}
            />
            <Button onClick={handleOnlineUpgrade} disabled={upgrading}>
              <Rocket className="mr-1 size-4" />
              一键在线升级
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="刷新">
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/app/model/Service/list" className="block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">服务总数</CardTitle>
              <Box className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '…' : services.length}</div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">服务状态</CardTitle>
            <Box className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : `${running} / ${services.length}`}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>服务状态分布</CardTitle>
            <CardDescription>当前运行 / 停止服务数</CardDescription>
          </CardHeader>
          <CardContent>
            <EChart option={pieOption} height={260} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>更新日志</CardTitle>
          </CardHeader>
          <CardContent>
            <LogTable logs={serviceLogs} loading={loading} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={(o) => !upgrading && setUpgradeOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>在线升级</DialogTitle>
            <DialogDescription>正在逐个升级可更新的服务与模块，期间请勿进行其他操作。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{upgradeText || '准备中...'}</p>
            <Progress value={upgradePercent} />
            <p className="text-right text-sm text-muted-foreground">{upgradePercent.toFixed(0)}%</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LogTable({ logs, loading }: { logs: UpdateLogItem[]; loading: boolean }) {
  const columns: Column<UpdateLogItem>[] = [
    { key: 'name', title: '名称' },
    {
      key: 'time',
      title: '更新时间',
      render: (l) =>
        l.time ? new Date(l.time).toLocaleString('zh-CN', { hour12: false }) : '-',
    },
    { key: 'msg', title: '更新信息', render: (l) => <div className="max-w-40 truncate">{l.msg}</div> },
    { key: 'version', title: '版本' },
  ]
  return (
    <div className="max-h-72 overflow-hidden rounded-md border">
      <DataTable
        columns={columns}
        data={logs}
        rowKey={(l) => `${l.name}-${l.version}-${l.time ?? ''}-${l.msg ?? ''}`}
        loading={loading}
        emptyText="暂无更新日志"
      />
    </div>
  )
}
