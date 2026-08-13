import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const THEME_ITEMS = [
  { value: 'light' as const, label: '亮色', icon: Sun },
  { value: 'dark' as const, label: '暗色', icon: Moon },
  { value: 'system' as const, label: '系统跟随', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="主题设置">
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">主题设置</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <DropdownMenuItem
              key={item.value}
              className="gap-2"
              onClick={() => setTheme(item.value)}
            >
              <Icon className="size-4" />
              {item.label}
              {theme === item.value && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
