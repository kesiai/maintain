import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { registerLocale } from 'echarts/core'
import { GaugeChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

import i18n from '@/i18n'

echarts.use([LineChart, PieChart, GaugeChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

/** echarts 内置语言包：不支持的语言（如 hi）回退 EN；zh-TW 使用 ZH */
import langZH from 'echarts/i18n/langZH.js'
import langEN from 'echarts/i18n/langEN.js'
import langAR from 'echarts/i18n/langAR.js'
import langDE from 'echarts/i18n/langDE.js'
import langES from 'echarts/i18n/langES.js'
import langFR from 'echarts/i18n/langFR.js'
import langJA from 'echarts/i18n/langJA.js'
import langKO from 'echarts/i18n/langKO.js'
import langRU from 'echarts/i18n/langRU.js'

const ECHARTS_LOCALES: Record<string, Record<string, unknown>> = {
  'zh-CN': langZH,
  en: langEN,
  'zh-TW': langZH,
  es: langES,
  hi: langEN,
  ru: langRU,
  fr: langFR,
  ar: langAR,
  de: langDE,
  ja: langJA,
  ko: langKO,
}

for (const [code, locale] of Object.entries(ECHARTS_LOCALES)) {
  registerLocale(code, locale as Parameters<typeof registerLocale>[1])
}

/** 当前 UI 语言对应的 echarts locale */
function echartsLocale(): string {
  const lang = i18n.resolvedLanguage || 'zh-CN'
  return lang in ECHARTS_LOCALES ? lang : 'en'
}

interface EChartProps {
  option: EChartsOption
  className?: string
  height?: number | string
}

/** 轻量 echarts 封装：初始化 + 响应式自适应 + option 更新 + 语言跟随 */
export function EChart({ option, className, height = 260 }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const locale = echartsLocale()

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { locale })
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [locale])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option, locale])

  return <div ref={ref} className={className} style={{ height, width: '100%' }} />
}
