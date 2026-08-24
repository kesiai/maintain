import { Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/lib/utils'

/** 语言切换器（登录页等无用户菜单的场景） */
export function LanguageSwitcher() {
  const { locale, changeLocale, locales } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="语言 / Language">
          <Languages className="size-[1.2rem]" />
          <span className="sr-only">语言 / Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            className={cn('gap-2', locale === l.code && 'text-primary')}
            onClick={() => changeLocale(l.code)}
          >
            <span className="w-6 text-xs">{l.code === 'zh-CN' ? '简' : l.code.slice(0, 2).toUpperCase()}</span>
            {l.label}
            {locale === l.code && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
