import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@kesi/client'
import { ChevronsUpDown, KeyRound, Languages, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTheme } from '@/components/theme-provider'
import { logout as apiLogout } from '@/lib/api/auth-api'
import { ChangePasswordDialog } from '@/components/layout/ChangePasswordDialog'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

/** 主题项（值即 i18n key） */
const THEME_ITEMS = [
  { value: 'light' as const, label: '亮色', icon: Sun },
  { value: 'dark' as const, label: '暗色', icon: Moon },
  { value: 'system' as const, label: '系统跟随', icon: Monitor },
]

/** 取用户名首字符（或前两个汉字）作为头像占位 */
function getInitials(name?: string) {
  if (!name) return '运'
  const trimmed = name.trim()
  if (!trimmed) return '运'
  return trimmed.slice(0, 1).toUpperCase()
}

/**
 * 用户菜单（NavUser 模式，对齐 kesi AppSidebar 的 UserMenu）
 * - 触发器：头像 + 名称 + 副标题 + ChevronsUpDown（折叠态自动收缩为图标）
 * - 菜单：修改密码 / 外观（亮色·暗色·系统跟随）/ 语言（弹出对话框）/ 退出登录
 */
export function UserMenu() {
  const navigate = useNavigate()
  const { user, setUser, storageKey } = useUser()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { isMobile } = useSidebar()
  const [pwdOpen, setPwdOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const displayName = user?.username || user?.name || t('用户')
  const subtitle = user?.email || t('运维管理平台')

  const handleLogout = async () => {
    try {
      await apiLogout()
    } catch {
      // 登出接口失败不阻塞本地登出
    }
    localStorage.removeItem(storageKey)
    sessionStorage.removeItem(storageKey)
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar size="sm" className="size-8 rounded-lg border">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              {/* 用户信息 */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar size="sm" className="size-8 rounded-lg border">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 账号 */}
              <DropdownMenuItem onClick={() => navigate('/app/changePassword')} className="gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                <span>{t('修改密码')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* 外观：主题 */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t('外观')}</DropdownMenuLabel>
              {THEME_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <DropdownMenuItem key={item.value} onClick={() => setTheme(item.value)} className="gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{t(item.label)}</span>
                    {theme === item.value && <span className="ml-auto text-xs text-primary">✓</span>}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />

              {/* 语言：打开语言对话框 */}
              <DropdownMenuItem onClick={() => setLangOpen(true)} className="gap-2">
                <Languages className="size-4 text-muted-foreground" />
                <span>{t('语言 / Language')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* 退出登录 */}
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
                <LogOut className="size-4" />
                <span>{t('退出登录')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* 语言对话框（由菜单「语言」触发） */}
      <LanguageSwitcher open={langOpen} onOpenChange={setLangOpen} hideTrigger />

      {/* 修改密码对话框 */}
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  )
}
