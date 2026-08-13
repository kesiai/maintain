import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/layout/UserMenu'
import { menuConfig, type MenuItem } from '@/data/menu'
import { bootstrapPlatform } from '@/stores/platform'

const SIDEBAR_EXPANDED = 'w-64'
const SIDEBAR_COLLAPSED = 'w-16'

function SidebarLink({
  item,
  collapsed,
  onClick,
}: {
  item: MenuItem
  collapsed: boolean
  onClick?: () => void
}) {
  if (!item.path) return null
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
        )
      }
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="truncate">{item.title}</span>}
    </NavLink>
  )
  if (collapsed) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    )
  }
  return link
}

function NavGroup({
  item,
  collapsed,
  onExpand,
}: {
  item: MenuItem
  collapsed: boolean
  onExpand: () => void
}) {
  const Icon = item.icon
  if (!item.children) {
    return <SidebarLink item={item} collapsed={collapsed} />
  }
  // 折叠态：只显示组图标，点击展开侧边栏
  if (collapsed) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <button
            onClick={onExpand}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {Icon && <Icon className="size-4 shrink-0" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    )
  }
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        {Icon && <Icon className="size-4" />}
        <span>{item.title}</span>
      </div>
      <div className="space-y-0.5 border-l border-border/60 pl-3 ml-4">
        {item.children.map((child) => (
          <SidebarLink key={child.path ?? child.title} item={child} collapsed={collapsed} />
        ))}
      </div>
    </div>
  )
}

export default function AppLayout() {
  const [ready, setReady] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // 启动时加载平台信息（serverInfo + 版本仓库），决定服务资源路径
  useEffect(() => {
    bootstrapPlatform().finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 可折叠侧边栏 */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r bg-muted/30 transition-all duration-300 ease-in-out md:flex',
          collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        )}
      >
        {/* 品牌区 */}
        <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b px-3', collapsed && 'justify-center px-0')}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
            运
          </div>
          {!collapsed && <span className="truncate text-sm font-semibold">运维管理平台</span>}
        </div>

        {/* 菜单 */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            {menuConfig.map((item) => (
              <NavGroup
                key={item.title}
                item={item}
                collapsed={collapsed}
                onExpand={() => setCollapsed(false)}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* 折叠开关 */}
        <div className="flex h-12 shrink-0 items-center justify-center border-t">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </Button>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-muted-foreground">
              {currentBreadcrumb(location.pathname)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

/** 根据当前路径找到菜单标题（用于顶栏面包屑） */
function currentBreadcrumb(pathname: string): string {
  for (const item of menuConfig) {
    if (item.path === pathname) return item.title
    for (const child of item.children ?? []) {
      if (child.path === pathname) return `${item.title} / ${child.title}`
    }
  }
  return ''
}
