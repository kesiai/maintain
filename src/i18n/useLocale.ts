/**
 * useLocale()：当前语言 + 语言切换（统一入口）
 *
 * 切换时：
 * - i18n.changeLanguage()（react-i18next 自动重渲染全树）
 * - setConfig({ language })（@kesi/client 联动 Accept-Language 请求头）
 * - document.documentElement.lang
 * - document.documentElement.dir（ar 等 RTL 语言自动切换为 rtl，触发布局镜像）
 * - localStorage 持久化
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { setConfig } from '@kesi/client'

import i18n, { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type LocaleCode } from './index'

export function useLocale() {
  const { i18n: instance } = useTranslation()

  const locale: LocaleCode =
    instance.resolvedLanguage && (SUPPORTED_LOCALES.map((l) => l.code) as string[]).includes(instance.resolvedLanguage)
      ? (instance.resolvedLanguage as LocaleCode)
      : 'zh-CN'

  const changeLocale = useCallback((code: LocaleCode) => {
    void i18n.changeLanguage(code)
    // @kesi/client 联动：请求头 Accept-Language 随语言切换
    setConfig({ language: code })
    document.documentElement.lang = code
    // RTL 支持：阿拉伯语等从右向左排版（i18next 内置 RTL 语言表）
    document.documentElement.dir = i18n.dir(code)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, code)
    } catch {
      // ignore
    }
  }, [])

  return { locale, changeLocale, locales: SUPPORTED_LOCALES }
}
