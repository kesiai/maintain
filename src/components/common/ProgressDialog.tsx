import { useEffect } from 'react'
import { toast } from 'sonner'

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
export function ProgressDialog({ open, onOpenChange, title = '升级进度', installId, onSuccess }: ProgressDialogProps) {
  const { info, stage, error } = useInstallPoll(installId)

  useEffect(() => {
    if (stage === 'done') {
      toast.success('升级完成')
      onSuccess?.()
      const t = setTimeout(() => onOpenChange(false), 800)
      return () => clearTimeout(t)
    }
  }, [stage, onOpenChange, onSuccess])

  useEffect(() => {
    if (stage === 'error') {
      toast.error(error || '升级失败')
    }
  }, [stage, error])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>正在处理安装任务，请稍候...</DialogDescription>
        </DialogHeader>
        <InstallProgressView info={info} stage={stage} />
      </DialogContent>
    </Dialog>
  )
}
