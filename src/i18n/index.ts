/**
 * i18next 全局实例（单例）
 *
 * 策略（见 i18n-plan.md）：「中文即 key」——key 就是中文原文，
 * zh-CN 不提供语言包，未命中时 fallback 返回 key 本身（即中文现状）；
 * 其余语言（en/zh-TW/es/hi/ru/fr/ar/de/ja/ko）由 locales/*.json 提供译文。
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import es from './locales/es.json'
import hi from './locales/hi.json'
import ru from './locales/ru.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

/** 支持的语言（zh-CN 为默认，无需语言包） */
export const SUPPORTED_LOCALES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'es', label: 'Español' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

/** 语言持久化键（与主题键 kesi-ui-theme 风格一致） */
export const LOCALE_STORAGE_KEY = 'kesi-ui-lang'

const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code)

/** 读取持久化语言，非法值回退默认 zh-CN */
export function getStoredLocale(): LocaleCode {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved && (LOCALE_CODES as string[]).includes(saved)) {
      return saved as LocaleCode
    }
  } catch {
    // ignore
  }
  return 'zh-CN'
}

const resources: Record<string, { translation: Record<string, string> }> = {
  en: { translation: en.translation },
  'zh-TW': { translation: zhTW.translation },
  es: { translation: es.translation },
  hi: { translation: hi.translation },
  ru: { translation: ru.translation },
  fr: { translation: fr.translation },
  ar: { translation: ar.translation },
  de: { translation: de.translation },
  ja: { translation: ja.translation },
  ko: { translation: ko.translation },
}

const initialLang = getStoredLocale()

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  // zh-CN 无语言包：未命中直接返回 key（中文原文），零回归
  fallbackLng: 'zh-CN',
  returnNull: false,
  interpolation: {
    // React 自带转义
    escapeValue: false,
  },
})

// 同步 html lang 与 dir（切换语言时由 useLocale 再次更新；ar 等 RTL 语言 dir=rtl）
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang
  document.documentElement.dir = i18n.dir(initialLang)
}

export default i18n
