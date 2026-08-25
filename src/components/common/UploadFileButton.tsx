import { useRef, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface UploadFileButtonProps {
  label?: string
  accept?: string
  icon?: ReactNode
  disabled?: boolean
  onUpload?: (file: File) => void | Promise<void>
}

/** 隐藏 file input 的通用上传按钮 */
export function UploadFileButton({ label, accept = '.tar.gz,.tgz,.zip', icon, disabled, onUpload }: UploadFileButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await onUpload?.(file)
      } finally {
        e.target.value = ''
      }
    }
  }

  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {icon}
        {label}
      </Button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </>
  )
}
