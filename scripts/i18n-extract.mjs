/**
 * i18n 存量文案提取脚本
 *
 * 扫描 src 下全部 .ts/.tsx 文件，提取所有含中文字符的字符串字面量（单引号/双引号/模板串）
 * 与 JSX 文本节点，去重后输出唯一文案清单（key 即中文原文）到 i18n-strings.json。
 *
 * 用途：作为 10 语言翻译的源清单；代码改造后用于核对 key 覆盖。
 * 用法：node scripts/i18n-extract.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { globSync } from 'node:fs'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = ROOT + 'src'
const OUT = ROOT + 'i18n-strings.json'

const CJK = /[\u4e00-\u9fff]/
const files = globSync(SRC + '/**/*.{ts,tsx}')

const counts = new Map() // 中文原文 -> 次数
const samples = new Map() // 中文原文 -> 示例位置

function bump(str, file, line) {
  const s = str.trim()
  if (!s || !CJK.test(s)) return
  counts.set(s, (counts.get(s) || 0) + 1)
  if (!samples.has(s)) samples.set(s, `${file}:${line}`)
}

for (const file of files) {
  const src = readFileSync(file, 'utf-8')
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const rel = file.replace(SRC + '/', 'src/')
    // 字符串字面量：'...' / "..." / `...`
    const re = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g
    let m
    while ((m = re.exec(line)) !== null) {
      if (CJK.test(m[2])) bump(m[2], rel, i + 1)
    }
    // JSX 文本节点：>中文<
    const textRe = />([^<>{}]*[\u4e00-\u9fff][^<>{}]*)</g
    while ((m = textRe.exec(line)) !== null) {
      bump(m[1], rel, i + 1)
    }
  }
}

const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
const result = {
  total: entries.length,
  generatedAt: new Date().toISOString(),
  strings: entries.map(([text, count]) => ({ text, count, sample: samples.get(text) })),
}

if (process.argv.includes('--write')) {
  writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`已写入 ${OUT}：共 ${entries.length} 条唯一文案`)
} else {
  console.log(`扫描到 ${entries.length} 条唯一文案（src 共 ${files.length} 个文件）`)
  for (const [text, count] of entries.slice(0, 20)) {
    console.log(`${count.toString().padStart(3)}  ${text}  (${samples.get(text)})`)
  }
}
