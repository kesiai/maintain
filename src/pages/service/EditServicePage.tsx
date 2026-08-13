import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { Plus, Trash2, UploadCloud } from 'lucide-react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { UploadDialog } from '@/components/common/UploadDialog'
import { ProgressDialog } from '@/components/common/ProgressDialog'
import { serverInfoAtom, newVersionsAtom, getPackageUrl, getUrls } from '@/stores/platform'
import { listServices, createService, updateService, onlineInstall, type ServiceItem } from '@/lib/api/service-api'
import { offlineInstallService } from '@/lib/api/upload-api'

interface EnvItem {
  name: string
  value: string
}
interface LabelItem {
  key: string
  value: string
}
interface PortItem {
  Host: string
  Container: string
  Protocol: string
}
interface VolumeItem {
  Container: string
  Host: string
  Mode: string
}

export default function EditServicePage() {
  const navigate = useNavigate()
  const params = useParams<{ name?: string }>()
  const editName = params.name
  const serverInfo = useAtomValue(serverInfoAtom)
  const repos = useAtomValue(newVersionsAtom)
  const urls = getUrls(serverInfo)
  const isWin = serverInfo?.serverType === 'windows'

  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [progressId, setProgressId] = useState<string | null>(null)

  // 在线添加
  const [onlineSearch, setOnlineSearch] = useState('')
  const [installingRepo, setInstallingRepo] = useState('')

  useEffect(() => {
    if (!editName) return
    let alive = true
    listServices()
      .then((list) => {
        if (alive) setEditing(list.find((s) => s.name === editName) || null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [editName])

  const backToList = () => navigate('/app/model/Service/list')

  const onlineCards = useMemo(() => {
    const list = repos.filter((r) => r.group_name === 'server' || r.group_name === 'driver')
    if (onlineSearch) {
      return list.filter(
        (r) => (r.repo_name || '').includes(onlineSearch) || (r.releases?.[0]?.description || '').includes(onlineSearch),
      )
    }
    return list
  }, [repos, onlineSearch])

  const handleOnlineInstall = async (repoName: string) => {
    const rel = repos.find((r) => r.repo_name === repoName)?.releases?.[0]
    const pkg = getPackageUrl(serverInfo, rel)
    if (!pkg) {
      toast.warning('无对应服务安装包')
      return
    }
    setInstallingRepo(repoName)
    try {
      const { id } = await onlineInstall(pkg)
      setProgressId(id)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || '安装失败')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={editName ? `编辑服务：${editName}` : '添加服务'} back onBack={backToList} />

      {!editName ? (
        <Tabs defaultValue="online">
          <TabsList>
            <TabsTrigger value="online">在线添加</TabsTrigger>
            <TabsTrigger value="offline">离线添加</TabsTrigger>
            <TabsTrigger value="high">高级添加</TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="搜索服务名称/描述"
                    value={onlineSearch}
                    onChange={(e) => setOnlineSearch(e.target.value)}
                  />
                </div>
                {onlineCards.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">暂无可用在线服务</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {onlineCards.map((r) => {
                      const rel = r.releases?.[0]
                      return (
                        <Card key={r.repo_name} className="border">
                          <CardContent className="space-y-2 pt-6">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{r.repo_name}</span>
                              <Badge variant="secondary">{rel?.tag_name || '-'}</Badge>
                            </div>
                            <p className="line-clamp-2 min-h-10 text-xs text-muted-foreground">
                              {rel?.description || '暂无描述'}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {rel?.create_time
                                  ? `更新于 ${new Date(rel.create_time).toLocaleDateString('zh-CN')}`
                                  : ''}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleOnlineInstall(r.repo_name || '')}
                                disabled={installingRepo === r.repo_name}
                              >
                                {installingRepo === r.repo_name ? '安装中...' : '安装'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offline" className="mt-4">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 pt-8 pb-8">
                <p className="text-sm text-muted-foreground">上传离线安装包（.gz / .zip）</p>
                <Button onClick={() => setUploadOpen(true)}>
                  <UploadCloud className="mr-1 size-4" />
                  选择文件
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="high" className="mt-4">
            <HighServiceForm
              isWin={isWin}
              submitText="创建"
              onSubmit={async (payload) => {
                await createService(payload)
                toast.success('新增服务成功')
                backToList()
              }}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <HighServiceForm
          isWin={isWin}
          submitText="保存"
          initial={editing}
          onSubmit={async (payload) => {
            await updateService(editName, payload)
            toast.success('修改服务成功')
            backToList()
          }}
        />
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="离线添加服务"
        accept={isWin ? '.zip' : '.gz,.zip'}
        onUpload={async (file) => {
          await offlineInstallService(urls.url4, file)
          toast.success('离线安装已提交')
        }}
      />

      <ProgressDialog
        open={progressId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setProgressId(null)
            setInstallingRepo('')
          }
        }}
        title="安装进度"
        installId={progressId}
        onSuccess={() => {}}
      />
    </div>
  )
}

/* ---------------- 高级添加 / 编辑表单 ---------------- */

function HighServiceForm({
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
        toast.info('请填写应用名称和命令')
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
        toast.error(err?.json?._error || err?.message || '保存失败')
      } finally {
        setSaving(false)
      }
      return
    }

    if (!name || !image) {
      toast.info('请填写应用名称和容器镜像')
      return
    }
    if (service !== 'None' && !path) {
      toast.info('请填写接口统一路径')
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
      toast.error(err?.json?._error || err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const envName = (i: number) => `环境变量 ${i + 1}`

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {!initial && (
            <Field label="应用名称" required description="具有此值的 app 标签将添加到部署的 Deployment 和 Service">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入应用名称" />
            </Field>
          )}

          {!isWin && (
            <Field label="容器镜像" required description="格式 xxx:xxx">
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="镜像名:标签" />
            </Field>
          )}

          {!isWin && (
            <Field label="Service 类型">
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
            <Field label="接口统一路径" required>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/xxx" />
            </Field>
          )}

          {isWin ? (
            <>
              <Field label="目录">
                <Input value={directory} onChange={(e) => setDirectory(e.target.value)} placeholder="工作目录" />
              </Field>
              <Field label="失败重试次数" description="-1 表示持续不停重试">
                <Input type="number" value={startRetries} onChange={(e) => setStartRetries(e.target.value)} />
              </Field>
              <Field label="自动启动">
                <Switch checked={startAuto} onCheckedChange={setStartAuto} />
              </Field>
            </>
          ) : (
            <>
              <Field label="运行命令" description="每行一条命令">
                <Textarea
                  rows={3}
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="/bin/bash&#10;-c"
                />
              </Field>
              <Field label="网络">
                <Input value={networks} onChange={(e) => setNetworks(e.target.value)} placeholder="默认网络名" />
              </Field>
              <Field label="特权模式">
                <Switch checked={privileged} onCheckedChange={setPrivileged} />
              </Field>

              <ArrayField
                label="环境变量"
                items={environment}
                onChange={setEnvironment}
                addLabel="添加环境变量"
                render={(item, i) => (
                  <>
                    <Input
                      placeholder="名称"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...environment]
                        next[i] = { ...next[i], name: e.target.value }
                        setEnvironment(next)
                      }}
                    />
                    <Input
                      placeholder="值"
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
                label="标签"
                items={labels}
                onChange={setLabels}
                addLabel="添加标签"
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
                label="端口"
                items={ports}
                onChange={setPorts}
                addLabel="添加端口"
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
                label="数据卷"
                items={volumes}
                onChange={setVolumes}
                addLabel="添加数据卷"
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
              {saving ? '保存中...' : submitText}
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
