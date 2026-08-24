import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  ChartLine,
  ChevronDown,
  Download,
  FileCode,
  History,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  Search,
  Square,
  Terminal,
  UploadCloud,
  Wrench,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
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
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/common/DataTable'
import { UploadDialog } from '@/components/common/UploadDialog'
import { ProgressDialog } from '@/components/common/ProgressDialog'
import { ServiceActionDialog, type ServiceAction } from '@/components/service/ServiceActionDialog'
import { serverInfoAtom, newVersionsAtom, findRelease, getPackageUrl, getUrls } from '@/stores/platform'
import {
  listServices,
  composeAction,
  containerAction,
  removeService,
  onlineInstall,
  type ServiceItem,
} from '@/lib/api/service-api'
import { uploadDriver, uploadProtocolProxy, uploadDataRelay, uploadImage, offlineInstallService } from '@/lib/api/upload-api'

export default function ServiceListPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const serverInfo = useAtomValue(serverInfoAtom)
  const repos = useAtomValue(newVersionsAtom)
  const urls = getUrls(serverInfo)
  const isWin = serverInfo?.serverType === 'windows'
  const isK8s = serverInfo?.serverType === 'k3s' || serverInfo?.serverType === 'k8s'

  const [items, setItems] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [uploadKind, setUploadKind] = useState<'proxy' | 'relay' | 'driver' | 'image' | 'offline' | null>(null)
  const [offlineTarget, setOfflineTarget] = useState<ServiceItem | null>(null)
  const [upgradeTarget, setUpgradeTarget] = useState<ServiceItem | null>(null)
  const [upgradeId, setUpgradeId] = useState<string | null>(null)
  const [action, setAction] = useState<ServiceAction | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listServices())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取服务列表失败'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = items
    if (search) list = list.filter((i) => (i.name || '').includes(search))
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [items, search])

  const runAction = async (action: 'start' | 'restart' | 'stop' | 'up', message: string) => {
    setBulkLoading(true)
    try {
      await composeAction(action)
      toast.success(message)
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('操作失败'))
    } finally {
      setBulkLoading(false)
    }
  }

  const runContainerAction = async (action: string) => {
    if (selected.length === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(selected.map((id) => containerAction(id, action)))
      toast.success(t('操作成功'))
      setSelected([])
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('操作失败'))
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async () => {
    setBulkLoading(true)
    try {
      const blocked = selected.filter((name) => serverInfo?.canNotDeleteServices?.includes(name))
      if (blocked.length > 0) {
        toast.warning(t('{{names}} 服务不可删除', { names: blocked.join(', ') }))
      }
      const ok = selected.filter((name) => !serverInfo?.canNotDeleteServices?.includes(name))
      await Promise.all(ok.map((name) => removeService(name)))
      toast.success(t('删除成功'))
      setSelected([])
      setDeleteOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('删除失败'))
    } finally {
      setBulkLoading(false)
    }
  }

  const startUpgrade = async (item: ServiceItem) => {
    const rel = findRelease(repos, item.repo) || findRelease(repos, item.repo, 'server') || findRelease(repos, item.repo, 'driver')
    const pkg = getPackageUrl(serverInfo, rel)
    if (!pkg) {
      toast.warning(t('无对应服务安装包'))
      return
    }
    try {
      const { id } = await onlineInstall(pkg)
      setUpgradeId(id)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('升级失败'))
    }
  }

  const openHistory = (item: ServiceItem) => {
    const v = serverInfo?.repos?.includes('v4') ? 'v4' : 'v3'
    window.open(`http://airiot.tech/repos/${item.repo}/${v}/releases`)
  }

  const columns: Column<ServiceItem>[] = [
    {
      key: 'name',
      title: t('服务名称'),
      width: 160,
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'state',
      title: t('状态'),
      width: 100,
      render: (r) => <StatusBadge state={r.state} />,
    },
    {
      key: 'createTime',
      title: t('创建时间'),
      width: 170,
      render: (r) =>
        r.createTime ? new Date(r.createTime * 1000).toLocaleString('zh-CN', { hour12: false }) : '-',
    },
    { key: 'image', title: t('镜像'), width: 220, render: (r) => <span className="break-all">{String(r.image ?? '')}</span> },
    {
      key: 'port',
      title: t('发布端口'),
      width: 120,
      render: (r) => <PortCell value={r.port} />,
    },
    { key: 'version', title: t('当前版本'), width: 100 },
    {
      key: 'dependencies',
      title: t('依赖最低版本'),
      width: 160,
      render: (r) =>
        r.dependencies && r.dependencies.length ? (
          <span className="text-xs text-muted-foreground">{r.dependencies.join(', ')}</span>
        ) : (
          '-'
        ),
    },
    {
      key: 'newVersion',
      title: t('最新版本'),
      width: 200,
      render: (r) => {
        const rel =
          findRelease(repos, r.repo) || findRelease(repos, r.repo, 'server') || findRelease(repos, r.repo, 'driver')
        const pkg = getPackageUrl(serverInfo, rel)
        const hasNew = rel && rel.tag_name !== r.version
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs">{rel?.tag_name ?? '-'}</span>
            {pkg && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => window.open(pkg)}>
                    <Download className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('下载最新版')}</TooltipContent>
              </Tooltip>
            )}
            {serverInfo?.online && hasNew && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-primary"
                onClick={() => {
                  setUpgradeTarget(r)
                  startUpgrade(r)
                }}
              >
                {t('在线升级')}
              </Button>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      title: t('操作'),
      width: 240,
      pinned: 'right',
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setAction({ type: 'edit', service: r })}>
            <Pencil className="mr-1 size-3.5" />
            {t('修改')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setAction({ type: 'log', service: r })}
          >
            {t('日志')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                {t('更多')}
                <ChevronDown className="ml-1 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openHistory(r)}>
                <History className="mr-2 size-4" />
                {t('历史版本')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOfflineTarget(r)}>
                <UploadCloud className="mr-2 size-4" />
                {t('离线升级')}
              </DropdownMenuItem>
              {!isWin && (
                <DropdownMenuItem onClick={() => setAction({ type: 'stats', service: r })}>
                  <ChartLine className="mr-2 size-4" />
                  {t('图表')}
                </DropdownMenuItem>
              )}
              {isWin && (
                <DropdownMenuItem onClick={() => setAction({ type: 'stats', service: r })}>
                  <ChartLine className="mr-2 size-4" />
                  {t('图表')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setAction({ type: 'inspect', service: r })}>
                <ScanSearch className="mr-2 size-4" />
                {t('检查')}
              </DropdownMenuItem>
              {!isWin && !isK8s && (
                <DropdownMenuItem onClick={() => setAction({ type: 'console', service: r })}>
                  <Terminal className="mr-2 size-4" />
                  {t('控制台')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('服务管理')}
        extra={
          <>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => runAction('up', t('创建并启动全部服务成功'))}
              disabled={bulkLoading}
              aria-label={t('创建并启动全部服务')}
            >
              <Play className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => runAction('start', t('启动全部服务成功'))}
              disabled={bulkLoading}
              aria-label={t('启动全部服务')}
            >
              <Play className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => runAction('restart', t('重启全部服务成功'))}
              disabled={bulkLoading}
              aria-label={t('重启全部服务')}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => runAction('stop', t('停止全部服务成功'))}
              disabled={bulkLoading}
              aria-label={t('停止全部服务')}
            >
              <Square className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Wrench className="mr-1 size-4" />
                  {t('工具')}
                  <ChevronDown className="ml-1 size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setUploadKind('proxy')}>
                  <UploadCloud className="mr-2 size-4" />
                  {t('离线上传代理服务')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUploadKind('relay')}>
                  <UploadCloud className="mr-2 size-4" />
                  {t('离线上传数据中转协议')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUploadKind('driver')}>
                  <UploadCloud className="mr-2 size-4" />
                  {t('离线上传驱动')}
                </DropdownMenuItem>
                {!isK8s && (
                  <DropdownMenuItem onClick={() => navigate('/app/model/Service/depolyment')}>
                    <FileCode className="mr-2 size-4" />
                    {t('编辑部署文件')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setUploadKind('image')}>
                  <UploadCloud className="mr-2 size-4" />
                  {t('上传镜像')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate('/app/model/Service/add')}>
              <Plus className="mr-1 size-4" />
              {t('添加服务')}
            </Button>
          </>
        }
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {t('已选 {{count}} 项', { count: selected.length })}
          </span>
          <Button size="sm" variant="outline" onClick={() => runContainerAction('start')} disabled={bulkLoading}>
            {t('开始')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => runContainerAction('stop')} disabled={bulkLoading}>
            {t('停止')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => runContainerAction('restart')} disabled={bulkLoading}>
            {t('重启')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={bulkLoading}>
            {t('删除')}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t('搜索服务名称')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {t('共 {{count}} 个服务', { count: filtered.length })}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.name || String(r.id) || ''}
        loading={loading}
        pagination={{ pageSize: 20 }}
        selection={{ selected, onSelect: setSelected }}
      />

      {/* 工具上传 */}
      <UploadDialog
        open={uploadKind !== null}
        onOpenChange={(o) => !o && setUploadKind(null)}
        title={
          uploadKind === 'proxy'
            ? t('离线上传代理服务')
            : uploadKind === 'relay'
              ? t('离线上传数据中转协议')
              : uploadKind === 'driver'
                ? t('离线上传驱动')
                : uploadKind === 'image'
                  ? t('上传镜像')
                  : ''
        }
        accept={uploadKind === 'image' ? '' : uploadKind === 'driver' && isWin ? '.zip' : '.gz,.zip'}
        onUpload={async (file) => {
          if (uploadKind === 'proxy') await uploadProtocolProxy(file)
          else if (uploadKind === 'relay') await uploadDataRelay(file)
          else if (uploadKind === 'driver') await uploadDriver(file, isK8s)
          else if (uploadKind === 'image') await uploadImage(file, isK8s)
        }}
      />

      {/* 单服务离线升级 */}
      <UploadDialog
        open={offlineTarget !== null}
        onOpenChange={(o) => !o && setOfflineTarget(null)}
        title={t('离线升级 {{name}}', { name: offlineTarget?.name ?? '' })}
        accept={isWin ? '.zip' : '.gz,.zip'}
        onUpload={async (file) => {
          if (offlineTarget) {
            await offlineInstallService(urls.url4, file, { name: offlineTarget.name || offlineTarget.Name || '' })
          }
        }}
      />

      {/* 单服务在线升级 */}
      <ProgressDialog
        open={upgradeTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setUpgradeTarget(null)
            setUpgradeId(null)
          }
        }}
        title={t('在线升级 {{name}}', { name: upgradeTarget?.name ?? '' })}
        installId={upgradeId}
        onSuccess={() => load()}
      />

      {/* 操作对话框：修改 / 日志 / 图表 / 检查 / 控制台 */}
      <ServiceActionDialog
        open={action !== null}
        onOpenChange={(o) => !o && setAction(null)}
        action={action}
        isWin={isWin}
        onSuccess={load}
      />

      {/* 删除确认 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('确认删除')}</AlertDialogTitle>
            <AlertDialogDescription>{t('确认删除选中的服务？此操作不可恢复。')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('取消')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('确定删除')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** 发布端口单元格：悬停显示完整端口内容（兼容逗号分隔 / JSON 数组）。 */
function PortCell({ value }: { value?: string }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { t } = useTranslation()

  const ports = useMemo(() => {
    const v = String(value ?? '').trim()
    if (!v) return []
    // 兼容 docker 端口映射 JSON：{"Host":"3030","Container":"3030"} 或数组
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.map((p) => String(typeof p === 'object' ? JSON.stringify(p) : p))
    } catch {
      /* 非 JSON，按逗号拆分 */
    }
    return v.split(',').map((s) => s.trim()).filter(Boolean)
  }, [value])

  const openHover = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeHover = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  if (ports.length === 0) {
    return <span className="text-muted-foreground">{value || '-'}</span>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          className="cursor-help border-b border-dotted border-foreground/30"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          {value}
        </span>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-auto min-w-40 p-2"
        onMouseEnter={openHover}
        onMouseLeave={closeHover}
      >
        <div className="space-y-1">
          <p className="px-1 text-xs text-muted-foreground">{t('发布端口')}</p>
          {ports.map((p, i) => (
            <p
              key={i}
              className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] leading-5"
            >
              {p}
            </p>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
