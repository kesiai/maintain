import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { ServiceItem } from '@/lib/api/service-api'

export interface EnvItem {
  name: string
  value: string
}
export interface LabelItem {
  key: string
  value: string
}
export interface PortItem {
  Host: string
  Container: string
  Protocol: string
}
export interface VolumeItem {
  Container: string
  Host: string
  Mode: string
}

/** 服务高级编辑 / 添加表单：`initial` 有值时视为编辑模式（隐藏应用名称输入）。 */
export function ServiceForm({
  isWin,
  initial,
  submitText,
  onSubmit,
}: {
  isWin: boolean
  initial?: ServiceItem | null
  submitText: string
  onSubmit: (payload: Record<string, any>) => Promise<void>
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [image, setImage] = useState('')
  const [service, setService] = useState('None')
  const [path, setPath] = useState('')
  const [command, setCommand] = useState('')
  const [networks, setNetworks] = useState('')
  const [privileged, setPrivileged] = useState(false)
  const [environment, setEnvironment] = useState<EnvItem[]>([])
  const [labels, setLabels] = useState<LabelItem[]>([])
  const [ports, setPorts] = useState<PortItem[]>([])
  const [volumes, setVolumes] = useState<VolumeItem[]>([])

  // Windows 专属字段
  const [directory, setDirectory] = useState('')
  const [startRetries, setStartRetries] = useState('3')
  const [startAuto, setStartAuto] = useState(false)

  useEffect(() => {
    if (!initial) return
    const img = initial.image
    setImage(typeof img === 'string' ? img : `${(img as any)?.Name ?? ''}:${(img as any)?.Tag ?? ''}`)
    setName(initial.name || '')
    setService(initial.service || 'None')
    setPath(initial.path || '')
    setCommand((initial.command || []).join('\n'))
    setNetworks((initial.networks?.[0] || '').toString())
    setPrivileged(!!initial.privileged)
    setEnvironment(
      (initial.environment || []).map((e: string) => {
        const [n, ...rest] = String(e).split('=')
        return { name: n, value: rest.join('=') }
      }),
    )
    setLabels(
      (initial.labels || []).map((l: string) => {
        const [k, ...rest] = String(l).split('=')
        return { key: k, value: rest.join('=') }
      }),
    )
    setPorts(initial.ports || [])
    setVolumes(initial.volumes || [])
    setDirectory(initial.directory || '')
    setStartRetries(String(initial.startRetries ?? 3))
    setStartAuto(!!initial.startAuto)
  }, [initial])

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isWin) {
      if (!name || !command) {
        toast.info(t('请填写应用名称和命令'))
        return
      }
      setSaving(true)
      try {
        await onSubmit({
          name,
          command,
          directory,
          startRetries: Number(startRetries),
          startAuto,
        })
      } catch (err: any) {
        toast.error(err?.json?._error || err?.message || t('保存失败'))
      } finally {
        setSaving(false)
      }
      return
    }

    if (!name || !image) {
      toast.info(t('请填写应用名称和容器镜像'))
      return
    }
    if (service !== 'None' && !path) {
      toast.info(t('请填写接口统一路径'))
      return
    }

    const [imageName, ...tagParts] = image.split(':')
    const payload: Record<string, any> = {
      name,
      image: { name: imageName, tag: tagParts.join(':') },
      service,
      command: command.split('\n').map((s) => s.trim()).filter(Boolean),
      privileged,
      environment: environment.filter((e) => e.name || e.value).map((e) => `${e.name}=${e.value}`),
      labels: labels.filter((l) => l.key || l.value).map((l) => `${l.key}=${l.value}`),
    }
    if (networks) payload.networks = [networks]
    if (service !== 'None') payload.path = path
    if (ports.length > 0) payload.ports = ports.filter((p) => p.Host || p.Container)
    if (volumes.length > 0) payload.volumes = volumes.filter((v) => v.Container || v.Host)

    setSaving(true)
    try {
      await onSubmit(payload)
    } catch (err: any) {
      toast.error(err?.json?._error || err?.message || t('保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const envName = (i: number) => t('环境变量 {{index}}', { index: i + 1 })

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {!initial && (
            <Field label={t('应用名称')} required description={t('具有此值的 app 标签将添加到部署的 Deployment 和 Service')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('请输入应用名称')} />
            </Field>
          )}

          {!isWin && (
            <Field label={t('容器镜像')} required description={t('格式 xxx:xxx')}>
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder={t('镜像名:标签')} />
            </Field>
          )}

          {!isWin && (
            <Field label={t('Service 类型')}>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          {!isWin && service !== 'None' && (
            <Field label={t('接口统一路径')} required>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/xxx" />
            </Field>
          )}

          {isWin ? (
            <>
              <Field label={t('目录')}>
                <Input value={directory} onChange={(e) => setDirectory(e.target.value)} placeholder={t('工作目录')} />
              </Field>
              <Field label={t('失败重试次数')} description={t('-1 表示持续不停重试')}>
                <Input type="number" value={startRetries} onChange={(e) => setStartRetries(e.target.value)} />
              </Field>
              <Field label={t('自动启动')}>
                <Switch checked={startAuto} onCheckedChange={setStartAuto} />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('运行命令')} description={t('每行一条命令')}>
                <Textarea
                  rows={3}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="/bin/bash&#10;-c"
                />
              </Field>
              <Field label={t('网络')}>
                <Input value={networks} onChange={(e) => setNetworks(e.target.value)} placeholder={t('默认网络名')} />
              </Field>
              <Field label={t('特权模式')}>
                <Switch checked={privileged} onCheckedChange={setPrivileged} />
              </Field>

              <ArrayField
                label={t('环境变量')}
                items={environment}
                onChange={setEnvironment}
                addLabel={t('添加环境变量')}
                render={(item, i) => (
                  <>
                    <Input
                      placeholder={t('名称')}
                      value={item.name}
                      onChange={(e) => {
                        const next = [...environment]
                        next[i] = { ...next[i], name: e.target.value }
                        setEnvironment(next)
                      }}
                    />
                    <Input
                      placeholder={t('值')}
                      value={item.value}
                      onChange={(e) => {
                        const next = [...environment]
                        next[i] = { ...next[i], value: e.target.value }
                        setEnvironment(next)
                      }}
                    />
                  </>
                )}
                keyOf={(_, i) => envName(i)}
              />

              <ArrayField
                label={t('标签')}
                items={labels}
                onChange={setLabels}
                addLabel={t('添加标签')}
                render={(item, i) => (
                  <>
                    <Input
                      placeholder="key"
                      value={item.key}
                      onChange={(e) => {
                        const next = [...labels]
                        next[i] = { ...next[i], key: e.target.value }
                        setLabels(next)
                      }}
                    />
                    <Input
                      placeholder="value"
                      value={item.value}
                      onChange={(e) => {
                        const next = [...labels]
                        next[i] = { ...next[i], value: e.target.value }
                        setLabels(next)
                      }}
                    />
                  </>
                )}
                keyOf={(_, i) => `label-${i}`}
              />

              <ArrayField
                label={t('端口')}
                items={ports}
                onChange={setPorts}
                addLabel={t('添加端口')}
                render={(item, i) => (
                  <>
                    <Input
                      placeholder="Host"
                      value={item.Host}
                      onChange={(e) => {
                        const next = [...ports]
                        next[i] = { ...next[i], Host: e.target.value }
                        setPorts(next)
                      }}
                    />
                    <Input
                      placeholder="Container"
                      value={item.Container}
                      onChange={(e) => {
                        const next = [...ports]
                        next[i] = { ...next[i], Container: e.target.value }
                        setPorts(next)
                      }}
                    />
                    <Select
                      value={item.Protocol}
                      onValueChange={(v) => {
                        const next = [...ports]
                        next[i] = { ...next[i], Protocol: v }
                        setPorts(next)
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tcp">tcp</SelectItem>
                        <SelectItem value="udp">udp</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                keyOf={(_, i) => `port-${i}`}
              />

              <ArrayField
                label={t('数据卷')}
                items={volumes}
                onChange={setVolumes}
                addLabel={t('添加数据卷')}
                render={(item, i) => (
                  <>
                    <Input
                      placeholder="Container"
                      value={item.Container}
                      onChange={(e) => {
                        const next = [...volumes]
                        next[i] = { ...next[i], Container: e.target.value }
                        setVolumes(next)
                      }}
                    />
                    <Input
                      placeholder="Host"
                      value={item.Host}
                      onChange={(e) => {
                        const next = [...volumes]
                        next[i] = { ...next[i], Host: e.target.value }
                        setVolumes(next)
                      }}
                    />
                    <Select
                      value={item.Mode}
                      onValueChange={(v) => {
                        const next = [...volumes]
                        next[i] = { ...next[i], Mode: v }
                        setVolumes(next)
                      }}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume">volume</SelectItem>
                        <SelectItem value="bind">bind</SelectItem>
                        <SelectItem value="ro">ro</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                keyOf={(_, i) => `vol-${i}`}
              />
            </>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('保存中...') : submitText}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  required,
  description,
  children,
}: {
  label: string
  required?: boolean
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

function ArrayField<T>({
  label,
  items,
  onChange,
  addLabel,
  render,
  keyOf,
}: {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  addLabel: string
  render: (item: T, index: number) => React.ReactNode
  keyOf: (item: T, index: number) => string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={keyOf(item, i)} className="flex items-center gap-2">
            {render(item, i)}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, {} as T])}>
        <Plus className="mr-1 size-4" />
        {addLabel}
      </Button>
    </div>
  )
}
