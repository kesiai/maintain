import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** 右侧操作区（按钮组等） */
  extra?: ReactNode
  /** 是否显示返回按钮（默认返回列表页） */
  back?: boolean
  onBack?: () => void
  titleClassName?: string
  /** 渐变标题配色（默认蓝紫渐变） */
  gradient?: string
}

export function PageHeader({
  title,
  subtitle,
  extra,
  back = false,
  onBack,
  titleClassName,
  gradient,
}: PageHeaderProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="sticky top-0 z-10 w-full -mt-6 border-b bg-background/95 px-2 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (onBack ? onBack() : navigate(-1))}
              aria-label={t('返回')}
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h1
              className={cn(
                'truncate text-xl font-bold',
                gradient ||
                  'bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent',
                titleClassName,
              )}
            >
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {extra && <div className="flex shrink-0 items-center gap-2">{extra}</div>}
      </div>
    </div>
  )
}
