import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Palette, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { saveLoadingCss } from '@/lib/api/upload-api'

export default function ProjectConfigPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return
    if (!file.name.endsWith('.css')) {
      toast.warning('请选择 .css 文件')
      return
    }
    setUploading(true)
    try {
      await saveLoadingCss(file)
      toast.success('Loading 样式已更新')
    } catch (e: any) {
      toast.error(e?.message || e?.json?._error || '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [])

  const handleRemove = async () => {
    try {
      await saveLoadingCss(null)
      toast.success('已恢复默认 Loading 样式')
      setRemoveOpen(false)
    } catch (e: any) {
      toast.error(e?.message || e?.json?._error || '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="系统设置" subtitle="项目配置与平台个性化" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              Loading 加载样式
            </CardTitle>
            <CardDescription>上传自定义 CSS 覆盖平台加载动画样式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>说明</AlertTitle>
              <AlertDescription>
                将平台启动时展示的 Loading 动画替换为你上传的 CSS 样式；移除后恢复默认样式。
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".css"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Upload className="mr-1 size-4" />
                {uploading ? '上传中...' : '上传 CSS 文件'}
              </Button>
              <Button variant="destructive" onClick={() => setRemoveOpen(true)}>
                <Trash2 className="mr-1 size-4" />
                移除自定义样式
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除</AlertDialogTitle>
            <AlertDialogDescription>将移除自定义 Loading 样式并恢复为平台默认样式，确认继续？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>确认移除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
