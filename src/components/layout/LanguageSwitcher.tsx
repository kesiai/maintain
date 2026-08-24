/**
 * 语言切换器（弹出对话框，移植自 kesi/src/components/layout/LanguageSwitcher.tsx）
 * 用于侧边栏用户菜单（hideTrigger 由菜单项触发）/ 登录页（自带触发按钮）
 */
import { useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useLocale } from '@/i18n/useLocale'
import { SUPPORTED_LOCALES, type LocaleCode } from '@/i18n'

const LOCALE_FLAGS: Record<LocaleCode, string> = {
  'zh-CN': '🇨🇳',
  'zh-TW': '🇨🇳',
  en: '🇬🇧',
  es: '🇪🇸',
  hi: '🇮🇳',
  ru: '🇷🇺',
  fr: '🇫🇷',
  ar: '🇸🇦',
  de: '🇩🇪',
  ja: '🇯🇵',
  ko: '🇰🇷',
}

interface LanguageSwitcherProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** 隐藏触发按钮（仅渲染对话框，由外部菜单项触发） */
  hideTrigger?: boolean
}

export function LanguageSwitcher({ open: openProp, onOpenChange, hideTrigger = false }: LanguageSwitcherProps = {}) {
  const { t } = useTranslation()
  const { locale, changeLocale } = useLocale()
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenInternal(v)
    onOpenChange?.(v)
  }

  const handleSelect = (lng: LocaleCode) => {
    void changeLocale(lng)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('语言 / Language')}>
            <Languages className="size-[1.2rem]" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('语言 / Language')}</DialogTitle>
          <DialogDescription>{t('选择界面显示语言')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 py-2">
          {SUPPORTED_LOCALES.map((l) => {
            const isActive = locale === l.code
            return (
              <Button
                key={l.code}
                variant={isActive ? 'default' : 'ghost'}
                className="justify-between h-11 px-4"
                onClick={() => handleSelect(l.code)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{LOCALE_FLAGS[l.code]}</span>
                  <span>{l.label}</span>
                </span>
                {isActive && <Check className="size-4" />}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LanguageSwitcher
