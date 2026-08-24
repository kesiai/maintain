import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UploadFileButton } from '@/components/common/UploadFileButton'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  accept?: string
  onUpload: (file: File) => Promise<void>
}

/** 通用「选择文件并上传」弹窗 */
export function UploadDialog({ open, onOpenChange, title, description, accept = '.gz,.zip', onUpload }: UploadDialogProps) {
  const [busy, setBusy] = useState(false)
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-center py-2">
          <UploadFileButton
            label={t('选择文件并上传')}
            accept={accept}
            disabled={busy}
            onUpload={async (file) => {
              setBusy(true)
              try {
                await onUpload(file)
                toast.success(t('上传成功'))
                onOpenChange(false)
              } catch (e: any) {
                toast.error(e?.json?._error || e?.message || t('上传失败'))
              } finally {
                setBusy(false)
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
