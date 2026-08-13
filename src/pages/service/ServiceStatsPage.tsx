import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { EChartsOption } from 'echarts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { EChart } from '@/components/common/EChart'
import { containerStats, winPref } from '@/lib/api/service-api'

interface Point {
  t: string
  memory?: number
  cache?: number
  cpu?: number
  rx?: number
  tx?: number
}

const fmt = (v?: number) => (v == null ? 0 : Math.round(v * 100) / 100)

function lineOption(
  title: string,
  series: { name: string; data: number[]; color?: string }[],
  times: string[],
  unit: string,
): EChartsOption {
  return {
    title: { text: title, textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis' },
    legend: { top: 4, right: 0 },
    grid: { left: 45, right: 16, top: 34, bottom: 26 },
    xAxis: { type: 'category', data: times },
    yAxis: { type: 'value', axisLabel: { formatter: `{value} ${unit}` } },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      areaStyle: { opacity: 0.12 },
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      data: s.data,
    })),
  }
}

export default function ServiceStatsPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const isWin = location.pathname.includes('winStats')
  const pod = params.get('podName') || ''

  const [points, setPoints] = useState<Point[]>([])
  const [intervalSec, setIntervalSec] = useState(5)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!pod) return
    const tick = async () => {
      try {
        const data = isWin ? await winPref(pod) : await containerStats(pod)
        const now = new Date()
        const time = now.toTimeString().slice(0, 8)
        const point: Point = { t: time }
        if (isWin) {
          point.memory = fmt((data.rss ?? 0) / 1024)
          point.cpu = fmt(data.pcpu ?? 0)
        } else {
          const ms = data.memory_stats
          const cs = data.cpu_stats
          point.memory = fmt((ms?.usage ?? 0) / 1024 / 1024)
          point.cache = fmt((ms?.stats?.cache ?? 0) / 1024 / 1024)
          point.cpu = fmt(((cs?.cpu_usage?.total_usage ?? 0) / (cs?.system_cpu_usage ?? 1)) * 100 * 100)
          point.rx = fmt((data?.networks?.eth0?.rx_bytes ?? 0) / 1024 / 1024)
          point.tx = fmt((data?.networks?.eth0?.tx_bytes ?? 0) / 1024 / 1024)
        }
        setPoints((prev) => [...prev.slice(-59), point])
      } catch (e: any) {
        // 轮询失败静默，避免刷屏
        void e
      }
    }
    tick()
    timerRef.current = setInterval(tick, intervalSec * 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pod, isWin, intervalSec])

  useEffect(() => {
    if (!pod) toast.warning('缺少 podName 参数')
  }, [pod])

  const times = useMemo(() => points.map((p) => p.t), [points])

  const memoryOption = useMemo(() => {
    if (isWin) {
      return lineOption('内存使用情况', [{ name: '内存', data: points.map((p) => p.memory ?? 0), color: '#3b82f6' }], times, 'MB')
    }
    return lineOption(
      '内存使用情况',
      [
        { name: '内存', data: points.map((p) => p.memory ?? 0), color: '#3b82f6' },
        { name: '缓存', data: points.map((p) => p.cache ?? 0), color: '#f59e0b' },
      ],
      times,
      'MB',
    )
  }, [points, times, isWin])

  const cpuOption = useMemo(
    () => lineOption('CPU 使用情况', [{ name: 'CPU', data: points.map((p) => p.cpu ?? 0), color: '#10b981' }], times, '%'),
    [points, times],
  )

  const networkOption = useMemo(
    () =>
      lineOption(
        '网络使用情况',
        [
          { name: 'RX on eth0', data: points.map((p) => p.rx ?? 0), color: '#8b5cf6' },
          { name: 'TX on eth0', data: points.map((p) => p.tx ?? 0), color: '#ec4899' },
        ],
        times,
        'MB',
      ),
    [points, times],
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={`容器监控：${pod}`}
        back
        extra={
          <Select value={String(intervalSec)} onValueChange={(v) => setIntervalSec(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 3, 5, 10, 30, 60].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  刷新：{s}秒
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">内存使用情况</CardTitle>
          </CardHeader>
          <CardContent>
            <EChart option={memoryOption} height={260} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">CPU 使用情况</CardTitle>
          </CardHeader>
          <CardContent>
            <EChart option={cpuOption} height={260} />
          </CardContent>
        </Card>
        {!isWin && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">网络使用情况</CardTitle>
            </CardHeader>
            <CardContent>
              <EChart option={networkOption} height={260} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
