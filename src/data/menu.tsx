import type { LucideIcon } from 'lucide-react'
import { Box, FileText, Gauge, Puzzle, Radio, Settings, Stethoscope } from 'lucide-react'

export interface MenuItem {
  title: string
  path?: string
  icon?: LucideIcon
  children?: MenuItem[]
}

/** 侧边栏菜单（与旧版路由保持一致） */
export const menuConfig: MenuItem[] = [
  { title: '服务管理', path: '/app/model/Service/list', icon: Box },
  { title: '模块管理', path: '/app/model/Modular/list', icon: Puzzle },
  { title: '资源统计', path: '/app/resourceStatistics', icon: Gauge },
  { title: '服务诊断', path: '/app/serviceDiagnosis', icon: Stethoscope },
  {
    title: '日志管理',
    icon: FileText,
    children: [
      { title: '操作日志', path: '/app/model/Log/list' },
      { title: '运维日志', path: '/app/log/operation' },
      { title: '服务管理日志', path: '/app/log/pm2' },
    ],
  },
  { title: '远程控制', path: '/app/model/RemoteControl/list', icon: Radio },
  { title: '系统设置', path: '/app/sys/project', icon: Settings },
]
