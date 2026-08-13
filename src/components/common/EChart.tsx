import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { GaugeChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([LineChart, PieChart, GaugeChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

interface EChartProps {
  option: EChartsOption
  className?: string
  height?: number | string
}

/** 轻量 echarts 封装：初始化 + 响应式自适应 + option 更新 */
export function EChart({ option, className, height = 260 }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={ref} className={className} style={{ height, width: '100%' }} />
}
