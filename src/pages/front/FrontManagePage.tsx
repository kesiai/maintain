import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MonitorUp, Rocket, ServerCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { UploadFileButton } from '@/components/common/UploadFileButton'
import { offlineInstallFront } from '@/lib/api/upload-api'
import { installInfo, type InstallInfo } from '@/lib/api/service-api'

/** 升级目标：管理平台 / 运维平台前端 */
type FrontTarget = 'management' | 'ops'

const TARGETS: Array<{
  key: FrontTarget
  title: string
  desc: string
  icon: typeof MonitorUp
  gradient: string
}> = [
  {
    key: 'management',
    title: '升级管理平台前端',
    desc: '上传管理平台前端升级包，升级完成后浏览器刷新即可生效。',
    icon: MonitorUp,
    gradient: 'from-blue-600 to-purple-600',
  },
  {
    key: 'ops',
    title: '升级运维平台前端',
    desc: '上传运维平台前端升级包，升级完成后浏览器刷新即可生效。',
    icon: ServerCog,
    gradient: 'from-emerald-600 to-teal-600',
  },
]

/** 校验前端升级包后缀（zip / tar.gz） */
function isSupportedArchive(name: string) {
  return /\.(tar\.gz|tgz|zip)$/i.test(name)
}

type FrontStage = 'installing' | 'done' | 'error'

/**
 * 前端安装进度轮询（GET api/installInfo/{id}）。
 * 前端安装没有 run 阶段，install.progress 达到 100 即视为成功。
 */
function useFrontInstallPoll(id: string | null) {
  const [info, setInfo] = useState<InstallInfo | null>(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<FrontStage>('installing')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let alive = true
    const tick = async () => {
      try {
        const res = await installInfo(id)
        if (!alive) return
        setInfo(res)

        const err = (['run', 'install', 'download'] as const)
          .map((k) => res[k]?.err)
          .find(Boolean)
        if (err) {
          setStage('error')
          setError(err)
          return
        }
        if (res.install?.progress === 100 || res.run?.progress === 100) {
          setStage('done')
          return
        }
        setProgress(res.install?.progress ?? res.run?.progress ?? res.download?.progress ?? 0)
      } catch (e) {
        if (alive) {
          setStage('error')
          setError(String(e))
        }
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [id])

  return { info, stage, progress, error }
}

/** 前端升级进度弹窗：轮询 installInfo，成功/失败后提示 */
function FrontProgressDialog({
  target,
  id,
  onClose,
}: {
  target: FrontTarget
  id: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { stage, progress, error } = useFrontInstallPoll(id)
  const title = t(TARGETS.find((tg) => tg.key === target)?.title ?? '前端升级')

  useEffect(() => {
    if (stage === 'done') {
      toast.success(t('升级完成'))
      const timer = setTimeout(onClose, 800)
      return () => clearTimeout(timer)
    }
  }, [stage, onClose, t])

  useEffect(() => {
    if (stage === 'error') {
      toast.error(error || t('升级失败'))
    }
  }, [stage, error, t])

  const isDone = stage === 'done'
  const isError = stage === 'error'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('正在处理安装任务，请稍候...')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className={cn(isError && 'text-destructive', isDone && 'text-emerald-600')}>
              {isDone ? t('已完成') : isError ? t('升级失败') : t('正在安装')}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className={cn(isError && '[&>div]:bg-destructive', isDone && '[&>div]:bg-emerald-500')}
          />
          {isError && error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FrontManagePage() {
  const { t } = useTranslation()
  /** 正在选择的升级目标（null = 未打开文件选择弹窗） */
  const [picker, setPicker] = useState<FrontTarget | null>(null)
  /** 正在执行的升级任务（id 用于轮询进度） */
  const [upgrade, setUpgrade] = useState<{ target: FrontTarget; id: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleUpload = async (target: FrontTarget, file: File) => {
    if (!isSupportedArchive(file.name)) {
      toast.error(t('请选择 .zip 或 .tar.gz 格式的压缩包'))
      return
    }
    setSubmitting(true)
    try {
      const res = await offlineInstallFront(file, target === 'ops')
      const id = res?.id
      if (!id) {
        toast.error(t('升级失败：未获取到安装任务'))
        return
      }
      setUpgrade({ target, id })
      setPicker(null)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('升级失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('前端管理')} subtitle={t('上传前端升级包，升级管理平台 / 运维平台前端')} />

      <div className="grid gap-4 md:grid-cols-2">
        {TARGETS.map((tg) => (
          <Card key={tg.key} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
                  tg.gradient,
                )}
              >
                <tg.icon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{t(tg.title)}</CardTitle>
                <CardDescription>{t(tg.desc)}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setPicker(tg.key)}>
                <Rocket className="mr-1 size-4" />
                {t('选择升级包')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 选择升级包并提交 */}
      <Dialog open={picker !== null} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {picker ? t(TARGETS.find((tg) => tg.key === picker)?.title ?? '前端升级') : t('前端升级')}
            </DialogTitle>
            <DialogDescription>{t('请选择前端升级包文件（支持 .zip / .tar.gz / .tgz）')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <UploadFileButton
              label={t('选择文件并上传')}
              accept=".zip,.tar.gz,.tgz"
              disabled={submitting}
              onUpload={(file) => {
                if (picker) return handleUpload(picker, file)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 升级进度 */}
      {upgrade && (
        <FrontProgressDialog
          target={upgrade.target}
          id={upgrade.id}
          onClose={() => setUpgrade(null)}
        />
      )}
    </div>
  )
}
