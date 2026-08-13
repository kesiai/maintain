import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@kesi/client'
import { LogOut, KeyRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout as apiLogout } from '@/lib/api/auth-api'
import { ChangePasswordDialog } from '@/components/layout/ChangePasswordDialog'

/** 取用户名首字符（或前两个汉字）作为头像占位 */
function getInitials(name?: string) {
  if (!name) return '运'
  const trimmed = name.trim()
  if (!trimmed) return '运'
  return trimmed.slice(0, 1).toUpperCase()
}

export function UserMenu() {
  const navigate = useNavigate()
  const { user, setUser, storageKey } = useUser()
  const [pwdOpen, setPwdOpen] = useState(false)

  const displayName = user?.username || user?.name || '用户'

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-accent/60">
            <Avatar size="sm" className="size-7 border">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2">
              <Avatar size="sm" className="size-8 border">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">运维管理平台</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate('/app/changePassword')}
            className={cn('gap-2')}
          >
            <KeyRound className="size-4 text-muted-foreground" />
            修改密码
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
            <LogOut className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  )
}
