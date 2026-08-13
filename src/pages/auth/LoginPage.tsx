import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@kesi/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Lock, LogIn, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ThemeToggle } from '@/components/theme-toggle'
import { login, type LoginParams } from '@/lib/api/auth-api'

const LS_USERNAME = 'kesi-login-username'
const LS_REMEMBER = 'kesi-login-remember'

/** 登录成功后归一化 user，@kesi/client 会把 user.token 原样放入 Authorization 头 */
function normalizeUser(res: Record<string, any>, username: string) {
  return {
    ...res,
    username,
    accessToken: res.accessToken,
    token: res.accessToken ? `Bearer ${res.accessToken}` : res.token,
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser, storageKey } = useUser()

  // 记住我：回填上次登录的用户名
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(LS_USERNAME) ?? ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_REMEMBER) === '1'
    } catch {
      return false
    }
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!name || !password) {
      toast.info('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      if (remember) {
        localStorage.setItem(LS_USERNAME, name)
        localStorage.setItem(LS_REMEMBER, '1')
      } else {
        localStorage.removeItem(LS_USERNAME)
        localStorage.setItem(LS_REMEMBER, '0')
      }

      const res = await login({ username: name, password } as LoginParams)
      const user = normalizeUser(res as Record<string, any>, name)

      setUser(user)
      localStorage.setItem(storageKey, JSON.stringify(user))

      navigate('/app/dashboard', { replace: true })
      toast.success('登录成功')
    } catch (err: any) {
      toast.error(err?.json?.message || err?.json?._error || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-background to-violet-100 p-4 sm:p-6 dark:from-slate-950 dark:via-background dark:to-slate-900">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0">
        {/* 网格，运维科技感 */}
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
        {/* 光晕 */}
        <div className="absolute -right-40 -top-40 size-80 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/10" />
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-600/10" />
      </div>

      {/* 主题切换 */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        {/* 主卡片 */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/85 shadow-2xl shadow-blue-900/10 backdrop-blur-xl dark:shadow-black/40">
          {/* 顶部品牌区 */}
          <div className="relative overflow-hidden bg-linear-to-br from-blue-600 to-purple-600 p-8 text-white sm:p-9">
            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-14 -left-8 size-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/20 font-bold text-3xl shadow-lg ring-1 ring-white/30 backdrop-blur">
                运
              </div>
              <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">运维管理平台</h1>
              <p className="text-sm text-blue-100">服务 · 模块 · 容器一站式运维</p>
            </div>
          </div>

          {/* 表单区 */}
          <div className="p-7 sm:p-9">
            <div className="mb-7">
              <h2 className="mb-1 text-2xl font-bold tracking-tight">欢迎回来</h2>
              <p className="text-sm text-muted-foreground">请登录您的账号以继续</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-xl bg-muted/50 pl-10 focus-visible:bg-background"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">密码</Label>
                  <button
                    type="button"
                    onClick={() => toast.info('请联系平台管理员重置密码')}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    忘记密码？
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl bg-muted/50 pl-10 pr-10 focus-visible:bg-background"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* 记住我 */}
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  aria-label="记住我"
                />
                记住我
              </label>

              {/* 登录按钮 */}
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-linear-to-r from-blue-600 to-purple-600 text-base font-medium text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-1.5 size-4" />
                    登 录
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* 底部版权 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2026 运维管理平台 · All rights reserved.
        </p>
      </div>
    </div>
  )
}
