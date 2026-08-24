import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { changePassword } from '@/lib/api/auth-api'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !newPassword2) {
      toast.warning(t('请填写完整'))
      return
    }
    if (newPassword !== newPassword2) {
      toast.error(t('两次输入的新密码不一致'))
      return
    }
    if (newPassword.length < 6) {
      toast.warning(t('新密码长度至少 6 位'))
      return
    }
    setSaving(true)
    try {
      await changePassword({ oldPassword, newPassword, newPassword2 })
      toast.success(t('密码修改成功'))
      setOldPassword('')
      setNewPassword('')
      setNewPassword2('')
      setTimeout(() => navigate('/app/dashboard'), 600)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.json?.message || e?.message || t('修改失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('修改密码')} back />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            {t('修改登录密码')}
          </CardTitle>
          <CardDescription>{t('修改后需使用新密码重新登录')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('旧密码')}</Label>
              <div className="relative">
                <Input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder={t('请输入旧密码')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowOld((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('新密码')}</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t('至少 6 位')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('确认新密码')}</Label>
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                autoComplete="new-password"
                placeholder={t('再次输入新密码')}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t('提交中...') : t('确认修改')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
