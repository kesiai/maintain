import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { changePassword } from '@/lib/api/auth-api'

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation()

  const reset = () => {
    setOldPassword('')
    setNewPassword('')
    setNewPassword2('')
    setShow(false)
  }

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
      onOpenChange(false)
      reset()
    } catch (err: any) {
      toast.error(err?.json?._error || err?.json?.message || err?.message || t('修改失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('修改密码')}</DialogTitle>
          <DialogDescription>{t('修改后需使用新密码重新登录')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('旧密码')}</Label>
            <Input
              type={show ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
              placeholder={t('请输入旧密码')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('新密码')}</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={t('至少 6 位')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('确认新密码')}</Label>
            <Input
              type={show ? 'text' : 'password'}
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              autoComplete="new-password"
              placeholder={t('再次输入新密码')}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('取消')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('提交中...') : t('确认修改')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
