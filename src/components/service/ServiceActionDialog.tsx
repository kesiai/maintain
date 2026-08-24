import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ServiceForm } from '@/components/service/ServiceForm'
import { ServiceLogContent } from '@/pages/service/ServiceLogPage'
import { ServiceStatsContent } from '@/pages/service/ServiceStatsPage'
import { ServiceInspectContent } from '@/pages/service/ServiceInspectPage'
import { ServiceConsoleContent } from '@/pages/service/ServiceConsolePage'
import { updateService, type ServiceItem } from '@/lib/api/service-api'

export type ServiceActionType = 'edit' | 'log' | 'stats' | 'inspect' | 'console'

export interface ServiceAction {
  type: ServiceActionType
  service: ServiceItem
}

/** 操作标题（值即 i18n key，渲染处 t()） */
const ACTION_TITLES: Record<ServiceActionType, string> = {
  edit: '编辑服务',
  log: '服务日志',
  stats: '容器监控',
  inspect: '容器检查',
  console: '控制台',
}

/** 服务管理操作对话框：修改 / 日志 / 图表 / 检查 / 控制台，宽度为页面 80%。 */
export function ServiceActionDialog({
  open,
  onOpenChange,
  action,
  isWin,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: ServiceAction | null
  isWin: boolean
  onSuccess?: () => void
}) {
  const { t } = useTranslation()
  const service = action?.service
  const pod = service ? String(service.id ?? service.name ?? '') : ''
  const title = action && service ? `${t(ACTION_TITLES[action.type])}：${service.name ?? service.id ?? ''}` : ''
  // 控制台已连接时，阻止 ESC / 点击外部误关对话框（ESC 应交给终端，如 vim/htop）
  const [consoleConnected, setConsoleConnected] = useState(false)

  useEffect(() => {
    if (!open) setConsoleConnected(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[80vw]"
        style={{ maxWidth: '80vw' }}
        onEscapeKeyDown={(e) => {
          if (consoleConnected) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          if (consoleConnected) e.preventDefault()
        }}
      >
        <div key={action ? `${action.type}-${pod}` : 'none'} className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6 pr-14">
            {action?.type === 'edit' && service && (
              <div className="space-y-4">
                <PageHeader title={title} />
                <ServiceForm
                  isWin={isWin}
                  submitText={t('保存')}
                  initial={service}
                  onSubmit={async (payload) => {
                    await updateService(String(service.name ?? ''), payload)
                    toast.success(t('修改服务成功'))
                    onOpenChange(false)
                    onSuccess?.()
                  }}
                />
              </div>
            )}
            {action?.type === 'log' && pod && <ServiceLogContent pod={pod} />}
            {action?.type === 'stats' && pod && <ServiceStatsContent pod={pod} isWin={isWin} />}
            {action?.type === 'inspect' && pod && <ServiceInspectContent pod={pod} />}
            {action?.type === 'console' && pod && (
              <ServiceConsoleContent pod={pod} onConnectedChange={setConsoleConnected} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
