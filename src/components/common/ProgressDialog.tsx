import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InstallProgressView } from '@/components/common/InstallProgress'
import { useInstallPoll } from '@/hooks/use-install-poll'

interface ProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** 安装任务 id（GET api/installInfo/{id}） */
  installId: string | null
  onSuccess?: () => void
}

/** 安装/升级进度弹窗：轮询 installInfo，成功/失败后自动关闭 */
export function ProgressDialog({ open, onOpenChange, title, installId, onSuccess }: ProgressDialogProps) {
  const { t } = useTranslation()
  const titleText = title ?? t('升级进度')
  const { info, stage, error } = useInstallPoll(installId)

  useEffect(() => {
    if (stage === 'done') {
      toast.success(t('升级完成'))
      onSuccess?.()
      const timer = setTimeout(() => onOpenChange(false), 800)
      return () => clearTimeout(timer)
    }
  }, [stage, onOpenChange, onSuccess, t])

  useEffect(() => {
    if (stage === 'error') {
      toast.error(error || t('升级失败'))
    }
  }, [stage, error, t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{t('正在处理安装任务，请稍候...')}</DialogDescription>
        </DialogHeader>
        <InstallProgressView info={info} stage={stage} />
      </DialogContent>
    </Dialog>
  )
}
