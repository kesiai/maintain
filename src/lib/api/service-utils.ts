/** 将镜像字段（字符串或 { Name, Tag }）统一为可展示文本 */
export function getImageText(image?: string | { Name?: string; Tag?: string } | null): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  const { Name, Tag } = image
  if (!Name) return Tag ? String(Tag) : ''
  return Tag ? `${Name}:${Tag}` : Name
}

/** 服务状态是否为「运行中」 */
export function isRunningState(state?: string): boolean {
  const st = String(state || '').toLowerCase()
  return st === 'running'
}
