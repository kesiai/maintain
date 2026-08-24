import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Eye, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/common/DataTable'
import {
  queryOpsLogs,
  queryLogCycles,
  removeLogCycle,
  execOnceLogClear,
  getCurrentUser,
  updateUser,
  type OpsLogItem,
  type LogCycleItem,
} from '@/lib/api/log-api'

const TIME_RANGES = [
  { key: 'today', label: '今天', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '近7天', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '近30天', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: '全部', ms: 0 },
]

export default function OperationLogPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('log')

  /* -------- 操作日志 -------- */
  const [items, setItems] = useState<OpsLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [range, setRange] = useState('today')
  const [types, setTypes] = useState<string[]>([])
  const [detail, setDetail] = useState<OpsLogItem | null>(null)

  const [pageSize, setPageSize] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const where: Record<string, any> = {}
      const tr = TIME_RANGES.find((r) => r.key === range)
      if (tr && tr.ms) where.time = { $gte: new Date(Date.now() - tr.ms).getTime() }
      if (search) where.$or = [
        { message: { $regex: search } },
        { name: { $regex: search } },
        { operator: { $regex: search } },
      ]
      if (type) where.type = type

      const { items: list, total: ttl } = await queryOpsLogs(
        { limit: pageSize, skip: (page - 1) * pageSize, order: { time: 'DESC' } },
        where,
      )
      setItems(list)
      setTotal(ttl)
      const uniq = Array.from(new Set(list.map((i) => i.type).filter(Boolean))) as string[]
      setTypes((prev) => Array.from(new Set([...prev, ...uniq])))
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取操作日志失败'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, type, range, t])

  useEffect(() => {
    load()
  }, [load])

  /* -------- 日志清理 -------- */
  const [cycles, setCycles] = useState<LogCycleItem[]>([])
  const [logQueryTime, setLogQueryTime] = useState('')
  const [clearing, setClearing] = useState(false)
  const [cycleDelete, setCycleDelete] = useState<LogCycleItem | null>(null)

  const loadCycles = useCallback(async () => {
    try {
      const [c, user] = await Promise.all([queryLogCycles(), getCurrentUser()])
      setCycles(c)
      setLogQueryTime(user?.logQueryTime || '')
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取清理配置失败'))
    }
  }, [t])

  useEffect(() => {
    if (tab === 'clean') loadCycles()
  }, [tab, loadCycles])

  const handleClear = async () => {
    setClearing(true)
    try {
      await execOnceLogClear({})
      toast.success(t('已开始清理日志'))
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('清理失败'))
    } finally {
      setClearing(false)
    }
  }

  const handleRemoveCycle = async () => {
    if (!cycleDelete?.id) return
    try {
      await removeLogCycle(cycleDelete.id)
      toast.success(t('删除成功'))
      setCycleDelete(null)
      loadCycles()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('删除失败'))
    }
  }

  const handleSaveQueryTime = async () => {
    try {
      await updateUser({ logQueryTime })
      toast.success(t('保存成功'))
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('保存失败'))
    }
  }

  const columns: Column<OpsLogItem>[] = [
    {
      key: 'time',
      title: t('时间'),
      width: 180,
      render: (r) => {
        const v = typeof r.time === 'string' ? r.time : r.time ? new Date(r.time).toLocaleString('zh-CN', { hour12: false }) : '-'
        return <span className="tabular-nums">{v}</span>
      },
    },
    {
      key: 'name',
      title: t('操作人员'),
      width: 120,
      render: (r) => r.name || r.operator || r.user || '-',
    },
    {
      key: 'type',
      title: t('类型'),
      width: 140,
      render: (r) => (r.type ? <Badge variant="outline">{r.type}</Badge> : '-'),
    },
    {
      key: 'message',
      title: t('操作内容'),
      width: 360,
      render: (r) => <span className="line-clamp-1 text-muted-foreground">{r.message || r.msg || '-'}</span>,
    },
    {
      key: 'ip',
      title: 'IP',
      width: 140,
      render: (r) => r.ip || '-',
    },
    {
      key: 'actions',
      title: t('操作'),
      width: 90,
      pinned: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setDetail(r)}>
          <Eye className="mr-1 size-3.5" />
          {t('详情')}
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={t('操作日志')} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="log">{t('操作日志')}</TabsTrigger>
          <TabsTrigger value="clean">{t('日志清理')}</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t('搜索操作内容/人员')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('全部类型')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('全部类型')}</SelectItem>
                {types.map((ty) => (
                  <SelectItem key={ty} value={ty}>{ty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={range} onValueChange={(v) => { setRange(v); setPage(1) }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{t(r.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={items}
            rowKey={(r) => r.id || `${r.time}-${r.ip}-${r.message}`}
            loading={loading}
            pagination={{
              pageSize,
              current: page,
              total,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size)
                setPage(1)
              },
            }}
          />
        </TabsContent>

        <TabsContent value="clean" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">{t('日志查询时间（TimeRange）')}</p>
                  <Input
                    className="w-80 font-mono text-xs"
                    placeholder={t('如 2024-01-01 00:00:00')}
                    value={logQueryTime}
                    onChange={(e) => setLogQueryTime(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveQueryTime}>{t('保存')}</Button>
                <Button variant="outline" className="ml-auto text-destructive" onClick={handleClear} disabled={clearing}>
                  <Trash2 className="mr-1 size-4" />
                  {clearing ? t('清理中...') : t('一键清除日志')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('日志清理会按照下面配置的清理周期定时执行；一键清除会立即清理当前周期之前的日志。')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t('清理周期配置')}</h3>
                <Button variant="outline" size="sm" onClick={loadCycles}>
                  <RefreshCw className="mr-1 size-3.5" />
                  {t('刷新')}
                </Button>
              </div>
              <DataTable
                columns={[
                  {
                    key: 'name',
                    title: t('名称'),
                    render: (r) => r.name || '-',
                  },
                  {
                    key: 'cycle',
                    title: t('周期'),
                    width: 140,
                    render: (r) => {
                      const unit = r.cycle_type === 'minute' ? t('分钟') : r.cycle_type === 'hour' ? t('小时') : r.cycle_type === 'day' ? t('天') : ''
                      return unit ? t('{{cycle}} {{unit}}', { cycle: r.cycle ?? '-', unit }) : (r.cycle ?? '-')
                    },
                  },
                  {
                    key: 'type',
                    title: t('清理类型'),
                    width: 140,
                    render: (r) => r.type || '-',
                  },
                  {
                    key: 'disabled',
                    title: t('状态'),
                    width: 100,
                    render: (r) => (
                      <Badge variant={r.disabled ? 'secondary' : 'default'}>{r.disabled ? t('停用') : t('启用')}</Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    title: t('操作'),
                    width: 90,
                    render: (r) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive"
                        onClick={() => setCycleDelete(r)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        {t('删除')}
                      </Button>
                    ),
                  },
                ]}
                data={cycles}
                rowKey={(r) => r.id || r.name || ''}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 详情 */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('操作日志详情')}</DialogTitle>
            <DialogDescription>{t('日志原始数据')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">{t('操作人员')}</p>
                <p>{detail?.name || detail?.operator || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('时间')}</p>
                <p>
                  {detail?.time
                    ? new Date(detail.time).toLocaleString('zh-CN', { hour12: false })
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('类型')}</p>
                <p>{detail?.type || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IP</p>
                <p>{detail?.ip || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">{t('操作内容')}</p>
              <p className="whitespace-pre-wrap">{detail?.message || detail?.msg || '-'}</p>
            </div>
            {(detail?.data || detail?.oldData) && (
              <div className="max-h-72 space-y-2 overflow-auto">
                {detail?.oldData && (
                  <div>
                    <p className="text-muted-foreground">{t('修改前（oldData）')}</p>
                    <pre className="rounded bg-muted/40 p-2 text-xs">{JSON.stringify(detail.oldData, null, 2)}</pre>
                  </div>
                )}
                {detail?.data && (
                  <div>
                    <p className="text-muted-foreground">{t('修改后（data）')}</p>
                    <pre className="rounded bg-muted/40 p-2 text-xs">{JSON.stringify(detail.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cycleDelete !== null} onOpenChange={(o) => !o && setCycleDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('确认删除')}</AlertDialogTitle>
            <AlertDialogDescription>{t('确认删除清理周期 {{name}}？', { name: cycleDelete?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCycle}>{t('确定删除')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
