import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Cpu,
  Gauge,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  Timer,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart } from '@/components/common/EChart'
import { PageHeader } from '@/components/common/PageHeader'
import { getSystemInfo, type SystemInfo, type SystemMem } from '@/lib/api/server-api'
import i18n from '@/i18n'

/** 仪表盘：圆弧仪表，按使用率变色 */
function gaugeOption(rate?: number): EChartsOption {
  const v = Math.round(rate ?? 0)
  return {
    tooltip: { formatter: () => i18n.t('已用 {{value}}%', { value: v }) },
    series: [
      {
        type: 'gauge',
        radius: '95%',
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        progress: { show: true, width: 8, itemStyle: { color: v > 90 ? '#ef4444' : v > 70 ? '#f59e0b' : '#3b82f6' } },
        axisLine: { lineStyle: { width: 8 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          formatter: `${v}%`,
          fontSize: 22,
          fontWeight: 700,
          offsetCenter: [0, '40%'],
        },
        data: [{ value: v }],
      },
    ],
  }
}

function fmt(v?: number, unit?: string) {
  return v == null ? '-' : `${v}${unit ?? ''}`
}

/** 使用率文字颜色：>90 红，>70 橙，否则绿 */
function usageClass(rate?: number) {
  const v = rate ?? 0
  return v > 90 ? 'text-red-600' : v > 70 ? 'text-amber-600' : 'text-emerald-600'
}

function UsageText({ rate }: { rate?: number }) {
  const v = Math.round(rate ?? 0)
  return <span className={`font-medium ${usageClass(rate)}`}>{v}%</span>
}

function UsageBadge({ rate }: { rate?: number }) {
  const v = Math.round(rate ?? 0)
  const cls =
    v > 90
      ? 'bg-red-500/10 text-red-600'
      : v > 70
        ? 'bg-amber-500/10 text-amber-600'
        : 'bg-emerald-500/10 text-emerald-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{v}%</span>
}

/** 图标徽章底色 */
const TONES: Record<string, string> = {
  blue: 'bg-blue-600/10 text-blue-600',
  cyan: 'bg-cyan-600/10 text-cyan-600',
  amber: 'bg-amber-600/10 text-amber-600',
  violet: 'bg-violet-600/10 text-violet-600',
  emerald: 'bg-emerald-600/10 text-emerald-600',
  red: 'bg-red-600/10 text-red-600',
}

/** 区块容器：渐变图标 + 标题 + 说明 */
function SectionCard({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: LucideIcon
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-purple-600 text-white shadow-sm">
          <Icon className="size-5" />
        </div>
        <div className="space-y-0.5">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function MetricCard({
  icon: Icon,
  tone = 'blue',
  label,
  value,
  sub,
}: {
  icon: LucideIcon
  tone?: keyof typeof TONES
  label: string
  value: string
  sub?: React.ReactNode
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

const MEM_META: Record<string, { title: string; desc: string }> = {
  mem: { title: '内存', desc: '物理内存' },
  swap: { title: '交换区', desc: 'Swap 交换空间' },
}

const MEM_ROWS: Array<{ label: string; dot: string; value: (m?: SystemMem) => string }> = [
  { label: '总量', dot: 'bg-blue-500', value: (m) => fmt(m?.total, m?.unit) },
  { label: '已用', dot: 'bg-red-500', value: (m) => fmt(m?.used, m?.unit) },
  { label: '剩余', dot: 'bg-emerald-500', value: (m) => fmt(m?.free, m?.unit) },
  { label: '可用', dot: 'bg-teal-500', value: (m) => fmt(m?.available, m?.unit) },
  { label: '共享', dot: 'bg-amber-500', value: (m) => fmt(m?.shared, m?.unit) },
  { label: '缓存', dot: 'bg-cyan-500', value: (m) => fmt(m?.bufferCache, m?.unit) },
]

function MemoryCard({ title, desc, m }: { title: string; desc: string; m?: SystemMem }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-violet-600/10 text-violet-600">
              <MemoryStick className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm">{t(title)}</CardTitle>
              {desc && <CardDescription className="text-xs">{t(desc)}</CardDescription>}
            </div>
          </div>
          <UsageBadge rate={m?.rate} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <EChart option={gaugeOption(m?.rate)} height={140} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {MEM_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className={`size-1.5 shrink-0 rounded-full ${row.dot}`} />
                {t(row.label)}
              </dt>
              <dd className="font-medium tabular-nums">{row.value(m)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function DiskCard({ fs }: { fs: SystemMem & { mountpoint?: string } }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-blue-600/10 text-blue-600">
              <HardDrive className="size-4" />
            </div>
            <CardTitle className="truncate text-sm font-medium">{fs.mountpoint ?? t('未知挂载点')}</CardTitle>
          </div>
          <UsageBadge rate={fs?.rate} />
        </div>
      </CardHeader>
      <CardContent>
        <EChart option={gaugeOption(fs?.rate)} height={140} />
        <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('可用')} {fmt(fs?.avail, fs?.unit)}</span>
          <span>{t('共')} {fmt(fs?.size, fs?.unit)}</span>
        </p>
      </CardContent>
    </Card>
  )
}

export default function ResourceStatisticsPage() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setInfo(await getSystemInfo())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取资源统计失败'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const memEntries = useMemo(() => Object.entries(info?.mem || {}), [info])
  const cpu = info?.cpu
  const disks = info?.filesystem || []

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('资源统计')}
        subtitle={t('服务器 CPU / 内存 / 磁盘实时使用情况')}
        extra={
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('正在获取资源统计...')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* CPU */}
          <SectionCard icon={Cpu} title="CPU" desc={t('处理器核心与平均负载')}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Cpu}
                tone="blue"
                label={t('CPU 核数')}
                value={`${cpu?.num ?? '-'}`}
                sub={
                  <span>
                    {t('使用率')} <UsageText rate={cpu?.rate} />
                  </span>
                }
              />
              <MetricCard
                icon={Activity}
                tone="cyan"
                label={t('平均负载（1 分钟）')}
                value={fmt(cpu?.load1)}
                sub={
                  <span>
                    {t('负载率')} <UsageText rate={cpu?.load1Rate} />
                  </span>
                }
              />
              <MetricCard
                icon={Gauge}
                tone="amber"
                label={t('平均负载（5 分钟）')}
                value={fmt(cpu?.load5)}
                sub={
                  <span>
                    {t('负载率')} <UsageText rate={cpu?.load5Rate} />
                  </span>
                }
              />
              <MetricCard
                icon={Timer}
                tone="violet"
                label={t('平均负载（15 分钟）')}
                value={fmt(cpu?.load15)}
                sub={
                  <span>
                    {t('负载率')} <UsageText rate={cpu?.load15Rate} />
                  </span>
                }
              />
            </div>
          </SectionCard>

          {/* 内存 */}
          <SectionCard icon={MemoryStick} title={t('内存')} desc={t('内存与交换区使用情况')}>
            {memEntries.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t('暂无内存数据')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {memEntries.map(([key, m]) => {
                  const meta = MEM_META[key] ?? { title: key, desc: '' }
                  return <MemoryCard key={key} title={meta.title} desc={meta.desc} m={m} />
                })}
              </div>
            )}
          </SectionCard>

          {/* 磁盘 */}
          <SectionCard icon={HardDrive} title={t('磁盘')} desc={t('磁盘分区使用情况')}>
            {disks.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t('暂无磁盘数据')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {disks.map((fs) => (
                  <DiskCard key={fs.mountpoint} fs={fs} />
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
