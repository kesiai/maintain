import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Spinner } from '@/components/ui/spinner'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { UserMenu } from '@/components/layout/UserMenu'
import { menuConfig, type MenuItem } from '@/data/menu'
import { bootstrapPlatform, serverInfoAtom } from '@/stores/platform'

/** 单个菜单项链接（shadcn SidebarMenuButton 模式） */
function MenuLink({ item, currentPath }: { item: MenuItem; currentPath: string }) {
  const { t } = useTranslation()
  if (!item.path) return null
  const Icon = item.icon
  const isActive = currentPath === item.path
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.title)}>
        <Link to={item.path}>
          {Icon && <Icon className="size-4 shrink-0" />}
          <span>{t(item.title)}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export default function AppLayout() {
  const [ready, setReady] = useState(false)
  const location = useLocation()
  const serverInfo = useAtomValue(serverInfoAtom)
  const { t } = useTranslation()

  // 启动时加载平台信息（serverInfo + 版本仓库），决定服务资源路径
  useEffect(() => {
    bootstrapPlatform().finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 菜单按平台过滤（与旧版 MainMenu 一致：服务管理日志仅 Windows 显示）
  const serverType = serverInfo?.serverType
  const menus = useMemo(
    () =>
      menuConfig.map((item) =>
        item.children?.some((c) => c.platform)
          ? {
              ...item,
              children: item.children.filter(
                (c) => !c.platform || (serverType != null && c.platform.includes(serverType)),
              ),
            }
          : item,
      ),
    [serverType],
  )

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* 品牌区：点击返回首页（保持原有结构） */}
        <SidebarHeader>
          <Link
            to="/app/dashboard"
            title={t('返回首页')}
            className="flex h-14 shrink-0 items-center gap-2 border-b px-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wrench className="size-4" />
            </div>
            <span className="truncate text-sm font-semibold">{t('运维管理平台')}</span>
          </Link>
        </SidebarHeader>

        {/* 中部：菜单（按平台过滤） */}
        <SidebarContent>
          {menus.map((item) =>
            item.children ? (
              <SidebarGroup key={item.title}>
                <SidebarGroupLabel>{t(item.title)}</SidebarGroupLabel>
                <SidebarMenu>
                  {item.children.map((child) => (
                    <MenuLink key={child.path ?? child.title} item={child} currentPath={location.pathname} />
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ) : (
              <SidebarGroup key={item.title}>
                <SidebarMenu>
                  <MenuLink item={item} currentPath={location.pathname} />
                </SidebarMenu>
              </SidebarGroup>
            ),
          )}
        </SidebarContent>

        {/* 底部：用户菜单（含主题/语言切换） */}
        <SidebarFooter className="relative">
          <UserMenu />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="overflow-auto">
        {/* 移动端侧栏开关（浮动在内容左上角） */}
        <SidebarTrigger className="md:hidden fixed top-3 z-40 ltr:left-3 rtl:right-3" />
        {/* 内容区 */}
        <div className="flex min-h-full flex-col p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
