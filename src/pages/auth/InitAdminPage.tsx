import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { OpsTechBg } from '@/components/common/OpsTechBg'
import { checkAdmin, registerAdmin } from '@/lib/api/auth-api'

/**
 * 管理员初始化页（/init，对齐旧版 old/src/userinfo/Reg.js）
 * - 系统未初始化（/user/admin/check 返回 404）时：设置 admin 密码
 * - 已初始化时：提示前往登录
 */
export default function InitAdminPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [checking, setChecking] = useState(true)
  const [notInitialized, setNotInitialized] = useState(false)
  const [password, setPassword] = useState('')
  const [password1, setPassword1] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 探测系统初始化状态（与启动时的 redirectToInitIfNoAdmin 同源）
  useEffect(() => {
    let alive = true
    void checkAdmin().then((hasAdmin) => {
      if (!alive) return
      setNotInitialized(!hasAdmin)
      setChecking(false)
    })
    return () => {
      alive = false
    }
  }, [])

  // 旧版 Reg.js 的密码规则：至少 6 位、必须同时包含字母与数字
  const passwordValid = /^(?![^a-zA-Z]+$)(?!\D+$)/.test(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !password1) {
      toast.warning(t('请填写完整'))
      return
    }
    if (password.length < 6) {
      toast.warning(t('密码长度至少 6 位'))
      return
    }
    if (!passwordValid) {
      toast.warning(t('密码必须为字母与数字组合'))
      return
    }
    if (password !== password1) {
      toast.error(t('两次输入的密码不一致'))
      return
    }
    setSubmitting(true)
    try {
      await registerAdmin(password)
      toast.success(t('管理员账号注册成功'))
      navigate('/login', { replace: true })
    } catch (err: any) {
      // 后端对已存在账号返回错误时提示「已存在」（对齐旧版 Reg.js）
      toast.error(err?.json?._error || err?.json?.message || t('初始化管理员失败，请重试'))
    } finally {
      setSubmitting(false)
    }
  }

  const background = (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
      <div className="absolute -right-40 -top-40 size-80 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10" />
      <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/10" />
      <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-600/10" />
    </div>
  )

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-background to-violet-100 p-4 sm:p-6 dark:from-slate-950 dark:via-background dark:to-slate-900">
      {background}

      {/* 语言 + 主题切换（逻辑定位，RTL 自动镜像） */}
      <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/85 shadow-2xl shadow-blue-900/10 backdrop-blur-xl dark:shadow-black/40">
          {/* 顶部品牌区：纯色 + 运维科技底图 */}
          <div className="relative overflow-hidden bg-blue-600 p-8 text-white sm:p-9">
            <OpsTechBg className="pointer-events-none absolute inset-0 size-full text-white/25" />
            <div className="relative flex flex-col items-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/20 font-bold text-3xl shadow-lg ring-1 ring-white/30 backdrop-blur">
                <img src="/logo.svg" alt="Logo" className="size-10" />
              </div>
              <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">{t('运维管理平台')}</h1>
              <p className="text-sm text-blue-100">{t('初始化管理员')}</p>
            </div>
          </div>

          {/* 表单区 */}
          <div className="p-7 sm:p-9">
            {checking ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">{t('正在检测系统初始化状态...')}</p>
              </div>
            ) : notInitialized ? (
              <>
                <div className="mb-7">
                  <h2 className="mb-1 text-2xl font-bold tracking-tight">{t('设置管理员密码')}</h2>
                  <p className="text-sm text-muted-foreground">{t('系统尚未初始化，请先设置管理员账号')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 管理员账号（固定 admin） */}
                  <div className="space-y-2">
                    <Label htmlFor="init-username">{t('管理员账号')}</Label>
                    <div className="relative">
                      <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="init-username" value="admin" readOnly className="h-11 rounded-xl bg-muted/50 pl-10" />
                    </div>
                  </div>

                  {/* 密码 */}
                  <div className="space-y-2">
                    <Label htmlFor="init-password">{t('密码')}</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="init-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t('至少 6 位，需包含字母与数字')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-xl bg-muted/50 pl-10 pr-10 focus-visible:bg-background"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? t('隐藏密码') : t('显示密码')}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 确认密码 */}
                  <div className="space-y-2">
                    <Label htmlFor="init-password1">{t('再次输入密码')}</Label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="init-password1"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t('请再次输入密码')}
                        value={password1}
                        onChange={(e) => setPassword1(e.target.value)}
                        className="h-11 rounded-xl bg-muted/50 pl-10 pr-10 focus-visible:bg-background"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full rounded-xl bg-blue-600 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        {t('提交中...')}
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-1.5 size-4" />
                        {t('注册管理员账号')}
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t('已有账号，去登录')}
                  {' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    {t('立即登录')}
                  </button>
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-7" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">{t('系统已初始化')}</h2>
                <p className="text-sm text-muted-foreground">{t('管理员账号已注册，请前往登录')}</p>
                <Button
                  className="mt-2 rounded-xl"
                  onClick={() => navigate('/login')}
                >
                  {t('前往登录')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 底部版权 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2026 {t('运维管理平台')} · All rights reserved.
        </p>
      </div>
    </div>
  )
}
