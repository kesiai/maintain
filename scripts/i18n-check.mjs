/**
 * i18n 完整性检查（CI 门禁）
 *
 * 1. 从源码提取全部 t('...') / i18n.t('...') key，与各语言包比对，报告缺失；
 * 2. 扫描源码中未包裹 t() 的中文字符串字面量（残留硬编码检查，--strict 可阻断）。
 *
 * 用法：
 *   node scripts/i18n-check.mjs          # 仅报告
 *   node scripts/i18n-check.mjs --strict # 有缺失/残留时 exit 1
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = ROOT + 'src'
const LOCALES = ROOT + 'src/i18n/locales'

// 中文字符串字面量属于「key 常量/原生语言名」而允许保留的文件（key 即中文原文策略）
const KEY_HOLDER_FILES = [
  'src/i18n/',
  'src/data/menu.tsx',
  'src/hooks/use-install-poll.ts',
  'src/components/common/StatusBadge.tsx',
  'src/components/theme-toggle.tsx',
  'src/components/layout/UserMenu.tsx',
  'src/components/service/ServiceActionDialog.tsx',
  'src/pages/dashboard/ResourceStatisticsPage.tsx',
  'src/pages/front/FrontManagePage.tsx',
  'src/pages/logs/OperationLogPage.tsx',
]

const CJK = /[\u4e00-\u9fff]/

function extractKeys(src) {
  const keys = new Set()
  // t('中文') / t("中文") / t(`中文{{x}}`) / i18n.t('中文')
  const re = /(?:^|[^.\w])t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
  let m
  while ((m = re.exec(src)) !== null) {
    if (CJK.test(m[2])) keys.add(m[2])
  }
  const re2 = /i18n\.t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
  while ((m = re2.exec(src)) !== null) {
    if (CJK.test(m[2])) keys.add(m[2])
  }
  return keys
}

const files = globSync(SRC + '/**/*.{ts,tsx}')
const allKeys = new Set()
let problems = 0

// 1) 收集所有 key
for (const f of files) {
  if (f.includes('/locales/')) continue
  const src = readFileSync(f, 'utf-8')
  for (const k of extractKeys(src)) allKeys.add(k)
}

// 2) 各语言包缺失检查
const locales = globSync(LOCALES + '/*.json')
for (const lf of locales) {
  const data = JSON.parse(readFileSync(lf, 'utf-8'))
  const trans = data.translation || {}
  const missing = [...allKeys].filter((k) => !(k in trans))
  if (missing.length) {
    problems += missing.length
    console.log(`[缺失] ${lf.split('/').pop()}: ${missing.length} 条`)
    for (const k of missing.slice(0, 20)) console.log(`    - ${k}`)
  } else {
    console.log(`[OK] ${lf.split('/').pop()}: ${Object.keys(trans).length} 条，无缺失`)
  }
}
console.log(`[key] 源码 t() 共 ${allKeys.size} 条`)

// 有意保留的 CJK（非 UI 文案）：双语标签、语言缩写、头像占位字等
const ALLOWED_RESIDUE = ['语言 / Language', "'简'", "'运'"]

// 3) 残留硬编码中文检查
let residue = []
for (const f of files) {
  if (f.includes('/locales/')) continue
  if (KEY_HOLDER_FILES.some((p) => f.includes(p))) continue
  const rel = f.replace(SRC + '/', 'src/')
  const src = readFileSync(f, 'utf-8')
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (!CJK.test(line)) continue
    // 剥离 JSX 注释（{/* ... */}）与行内块注释
    line = line.replace(/\/\*[\s\S]*?\*\//g, '')
    if (!CJK.test(line)) continue
    const trimmed = line.trim()
    // 跳过整行注释（// 或 *）、console 日志、已包裹的 t() 调用
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
    if (trimmed.includes('console.')) continue
    if (trimmed.includes("t('") || trimmed.includes('t("') || trimmed.includes('t(`') || trimmed.includes('i18n.t(')) continue
    // 剥离行尾 // 注释后再判断
    const codePart = line.replace(/\/\/.*$/, '')
    if (!CJK.test(codePart)) continue
    if (ALLOWED_RESIDUE.some((s) => codePart.includes(s))) continue
    residue.push(`${rel}:${i + 1}: ${codePart.trim().slice(0, 100)}`)
  }
}
if (residue.length) {
  problems += residue.length
  console.log(`\n[残留中文] ${residue.length} 处（可能需包裹 t() 或加入白名单）`)
  for (const r of residue.slice(0, 40)) console.log(`    ${r}`)
} else {
  console.log('[残留中文] 未发现')
}

if (process.argv.includes('--strict') && problems > 0) {
  console.log(`\ni18n-check 失败：${problems} 个问题`)
  process.exit(1)
}
console.log(`\ni18n-check 完成：${problems} 个问题`)
