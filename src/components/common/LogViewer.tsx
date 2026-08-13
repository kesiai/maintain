import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Pause, Play, RefreshCw, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'

export interface LogQuery {
  timestamps?: boolean
  since?: number
  tail?: number
  refresh?: boolean
}

interface LogViewerProps {
  title: string
  fetchLogs: (params: LogQuery) => Promise<string>
  /** 提供时显示导出按钮 */
  exportLogs?: (params: { since?: number; tail?: number }) => Promise<Blob>
  exportName?: string
  /** 是否显示高级过滤（timestamps/since/tail）；win 端仅显示 refresh */
  showAdvanced?: boolean
}

/** 通用日志查看器：原始文本 + 自动刷新 + 关键字高亮 + 导出 */
export function LogViewer({ title, fetchLogs, exportLogs, exportName = 'log.zip', showAdvanced = true }: LogViewerProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [timestamps, setTimestamps] = useState(false)
  const [since, setSince] = useState('')
  const [tail, setTail] = useState(100)
  const [refresh, setRefresh] = useState(true)
  const [search, setSearch] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportSince, setExportSince] = useState('')
  const [exportTail, setExportTail] = useState(100)

  const boxRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: LogQuery = { timestamps, tail }
      if (since) params.since = Math.floor(new Date(since).getTime() / 1000)
      const data = await fetchLogs(params)
      setText(data)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '获取日志失败')
    } finally {
      setLoading(false)
    }
  }, [fetchLogs, timestamps, since, tail])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!refresh) return
    const timer = setInterval(load, 1000)
    return () => clearInterval(timer)
  }, [refresh, load])

  // 自动滚动到底部
  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  const highlighted = useMemo(() => {
    const lines = text.split('\n')
    if (!search) return lines
    return lines.filter((l) => l.includes(search))
  }, [text, search])

  const renderLine = (line: string, i: number) => {
    if (!search || !line.includes(search)) {
      return <div key={i}>{line || ' '}</div>
    }
    const idx = line.indexOf(search)
    return (
      <div key={i}>
        {line.slice(0, idx)}
        <mark className="bg-orange-400 px-0 text-green-600">{line.slice(idx, idx + search.length)}</mark>
        {line.slice(idx + search.length)}
      </div>
    )
  }

  const handleExport = async () => {
    if (!exportLogs) return
    try {
      const blob = await exportLogs({
        since: exportSince ? Math.floor(new Date(exportSince).getTime() / 1000) : undefined,
        tail: exportTail,
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = exportName
      a.click()
      URL.revokeObjectURL(a.href)
      setExportOpen(false)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '导出失败')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        extra={
          <>
            {exportLogs && (
              <Button variant="outline" onClick={() => setExportOpen(true)}>
                <Download className="mr-1 size-4" />
                导出日志
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="刷新">
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="mb-3 flex flex-wrap items-end gap-4">
            {showAdvanced && (
              <>
                <div className="flex items-center gap-2">
                  <Switch checked={timestamps} onCheckedChange={setTimestamps} id="ts" />
                  <Label htmlFor="ts" className="text-sm">
                    显示时间戳
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">起始时间</Label>
                  <Input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} className="w-52" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">行数</Label>
                  <Input
                    type="number"
                    value={tail}
                    onChange={(e) => setTail(Number(e.target.value))}
                    className="w-24"
                    min={1}
                  />
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={refresh} onCheckedChange={setRefresh} id="refresh" />
              <Label htmlFor="refresh" className="text-sm">
                自动刷新
              </Label>
              {refresh ? (
                <Play className="size-4 text-emerald-600" />
              ) : (
                <Pause className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="relative ml-auto w-56">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 pr-8"
                placeholder="搜索关键字"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                  onClick={() => setSearch('')}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div
            ref={boxRef}
            className="h-[420px] overflow-auto rounded-md bg-black p-3 font-mono text-xs leading-5 text-green-400"
          >
            {loading && text === '' ? (
              <div className="text-muted-foreground">加载中...</div>
            ) : highlighted.length === 0 ? (
              <div className="text-muted-foreground">暂无日志</div>
            ) : (
              highlighted.map((line, i) => renderLine(line, i))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>导出日志</DialogTitle>
            <DialogDescription>设置导出时间范围与行数</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">起始时间</Label>
              <Input type="datetime-local" value={exportSince} onChange={(e) => setExportSince(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">行数</Label>
              <Input type="number" value={exportTail} onChange={(e) => setExportTail(Number(e.target.value))} min={1} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleExport}>导出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
