import { toast } from 'sonner'

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
  const service = action?.service
  const pod = service ? String(service.id ?? service.name ?? '') : ''
  const title = action && service ? `${ACTION_TITLES[action.type]}：${service.name ?? service.id ?? ''}` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[80vw]"
        style={{ maxWidth: '80vw' }}
      >
        <div key={action ? `${action.type}-${pod}` : 'none'} className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-6 pr-14">
            {action?.type === 'edit' && service && (
              <div className="space-y-4">
                <PageHeader title={title} />
                <ServiceForm
                  isWin={isWin}
                  submitText="保存"
                  initial={service}
                  onSubmit={async (payload) => {
                    await updateService(String(service.name ?? ''), payload)
                    toast.success('修改服务成功')
                    onOpenChange(false)
                    onSuccess?.()
                  }}
                />
              </div>
            )}
            {action?.type === 'log' && pod && <ServiceLogContent pod={pod} />}
            {action?.type === 'stats' && pod && <ServiceStatsContent pod={pod} isWin={isWin} />}
            {action?.type === 'inspect' && pod && <ServiceInspectContent pod={pod} />}
            {action?.type === 'console' && pod && <ServiceConsoleContent pod={pod} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
