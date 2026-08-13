import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { Download, History, Plus, RefreshCw, Rocket, Search, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
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
import { UploadDialog } from '@/components/common/UploadDialog'
import { ProgressDialog } from '@/components/common/ProgressDialog'
import { newVersionsAtom, findRelease } from '@/stores/platform'
import { listModulars, removeModular, modularOnlineInstall, type ModularItem } from '@/lib/api/modular-api'
import { offlineInstallFront } from '@/lib/api/upload-api'

export default function ModularListPage() {
  const repos = useAtomValue(newVersionsAtom)

  const [items, setItems] = useState<ModularItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [offlineOpen, setOfflineOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ModularItem | null>(null)
  const [upgradeTarget, setUpgradeTarget] = useState<ModularItem | null>(null)
  const [upgradeId, setUpgradeId] = useState<string | null>(null)
  const [upgradingAll, setUpgradingAll] = useState(false)
  const [progress, setProgress] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listModulars())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '获取模块列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    let list = items
    if (search) list = list.filter((i) => (i.name || i.id || '').includes(search))
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [items, search])

  const isMaintain = (item: ModularItem) => (item.id || item.name || '').includes('iot-maintain')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeModular(deleteTarget.id || deleteTarget.name || '', deleteTarget.groupName || deleteTarget.item?.groupName)
      toast.success('删除成功')
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '删除失败')
    }
  }

  const handleUpgrade = async (item: ModularItem) => {
    const rel = findRelease(repos, item.id)
    const url = rel?.assets?.[0]?.url
    if (!url) {
      toast.warning('无可用升级包')
      return
    }
    try {
      const { id } = await modularOnlineInstall(url, isMaintain(item))
      setUpgradeId(id)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '升级失败')
    }
  }

  const handleUpgradeAll = async () => {
    setUpgradingAll(true)
    setProgress(0)
    try {
      const targets = items.filter((m) => {
        const rel = findRelease(repos, m.id)
        return rel && rel.assets?.[0]?.url && rel.tag_name !== `v${m.version}`
      })
      if (targets.length === 0) {
        toast.info('已是最新版本')
        return
      }
      let done = 0
      for (const m of targets) {
        const rel = findRelease(repos, m.id)
        if (!rel?.assets?.[0]?.url) continue
        const { id } = await modularOnlineInstall(rel.assets[0].url, isMaintain(m))
        for (;;) {
          const { installInfo } = await import('@/lib/api/service-api')
          const info = await installInfo(id)
          if (info.install?.err || info.download?.err) throw new Error(info.install?.err || info.download?.err)
          if (info.install?.progress === 100 || info.run?.progress === 100) break
          await new Promise((r) => setTimeout(r, 1000))
        }
        done += 1
        setProgress(Math.round((done / targets.length) * 100))
      }
      toast.success('在线升级完成')
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '在线升级失败')
    } finally {
      setUpgradingAll(false)
    }
  }

  const columns: Column<ModularItem>[] = [
    {
      key: 'name',
      title: '模块名称',
      width: 200,
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'modTime',
      title: '创建时间',
      width: 170,
      render: (r) =>
        r.modTime ? new Date(r.modTime).toLocaleString('zh-CN', { hour12: false }) : '-',
    },
    {
      key: 'description',
      title: '描述',
      width: 260,
      render: (r) => {
        const d = r.descriptionEn || r.description
        return <span className="line-clamp-1 text-muted-foreground">{d || '-'}</span>
      },
    },
    {
      key: 'version',
      title: '版本',
      width: 100,
      render: (r) => <Badge variant="outline">v{r.version}</Badge>,
    },
    {
      key: 'newVersion',
      title: '最新版本',
      width: 220,
      render: (r) => {
        const rel = findRelease(repos, r.id)
        const url = rel?.assets?.[0]?.url
        const hasNew = rel && rel.tag_name !== `v${r.version}`
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs">{rel?.tag_name ?? '-'}</span>
            {url && (
              <Button variant="ghost" size="icon" className="size-6" onClick={() => window.open(url)}>
                <Download className="size-3.5" />
              </Button>
            )}
            {hasNew && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-primary" onClick={() => handleUpgrade(r)}>
                在线升级
              </Button>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              const v = r.id?.includes('v4') ? 'v4' : 'v3'
              window.open(`http://airiot.tech/repos/${r.id}/${v}/releases`)
            }}
          >
            <History className="mr-1 size-3.5" />
            历史版本
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="mr-1 size-3.5" />
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="模块管理"
        extra={
          <>
            <Button variant="outline" onClick={handleUpgradeAll} disabled={upgradingAll}>
              <Rocket className="mr-1 size-4" />
              {upgradingAll ? `批量升级 ${progress}%` : '批量升级'}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 size-4" />
              添加/更新模块
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="刷新">
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="搜索模块名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          共 <span className="font-medium">{filtered.length}</span> 个模块
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id || r.name || ''}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 添加/更新模块 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加/更新模块</DialogTitle>
            <DialogDescription>可在线安装或离线上传模块包</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => setOfflineOpen(true)}>
              离线添加/更新
            </Button>
            <div className="max-h-80 space-y-2 overflow-auto rounded-md border p-3">
              {repos
                .filter((r) => r.group_name === 'front')
                .map((r) => {
                  const rel = r.releases?.[0]
                  return (
                    <Card key={r.repo_name}>
                      <CardContent className="flex items-center justify-between gap-2 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.repo_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {rel?.description || '暂无描述'} · {rel?.tag_name || '-'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            const url = rel?.assets?.[0]?.url
                            if (!url) {
                              toast.warning('无安装包')
                              return
                            }
                            try {
                              const { id } = await modularOnlineInstall(url, (r.repo_name || '').includes('iot-maintain'))
                              setUpgradeId(id)
                            } catch (e: any) {
                              toast.error(e?.json?._error || e?.message || '安装失败')
                            }
                          }}
                        >
                          安装
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UploadDialog
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        title="离线添加/更新模块"
        accept=".gz,.zip"
        onUpload={async (file) => {
          await offlineInstallFront(file)
          toast.success('离线安装已提交')
        }}
      />

      <ProgressDialog
        open={upgradeTarget !== null || upgradeId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setUpgradeTarget(null)
            setUpgradeId(null)
          }
        }}
        title="模块升级"
        installId={upgradeId}
        onSuccess={() => load()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确认删除模块 {deleteTarget?.name}？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确定删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
