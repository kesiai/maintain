import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Download, Globe, Play, RefreshCw, Save, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import {
  proxyPing,
  getProxyConfig,
  saveProxyConfig,
  startProxy,
  stopProxy,
  downloadClient,
  type ProxyConfig,
} from '@/lib/api/proxy-api'

const PLATFORMS = [
  { key: 'windows', label: 'Windows' },
  { key: 'darwin', label: 'macOS' },
  { key: 'linux', label: 'Linux' },
]

export default function RemoteControlPage() {
  const { t } = useTranslation()
  const [config, setConfig] = useState<ProxyConfig>({})
  const [ping, setPing] = useState<{ internetAccess?: boolean; platform?: string } | null>(null)
  const [pinging, setPinging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [platform, setPlatform] = useState('windows')

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([getProxyConfig(), proxyPing()])
      setConfig(c || {})
      setPing(p || null)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取远程控制配置失败'))
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProxyConfig({
        targetIp: config.targetIp,
        targetPort: config.targetPort,
        serverPort: config.serverPort,
        vkey: config.vkey,
      })
      toast.success(t('配置已保存'))
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const handleStart = async () => {
    setBusy(true)
    try {
      await startProxy()
      toast.success(t('远程控制已启动'))
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('启动失败'))
    } finally {
      setBusy(false)
    }
  }

  const handleStop = async () => {
    setBusy(true)
    try {
      await stopProxy()
      toast.success(t('远程控制已停止'))
      load()
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('停止失败'))
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async () => {
    try {
      const blob = await downloadClient(platform)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `remote-client-${platform}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('下载失败'))
    }
  }

  const handlePing = async () => {
    setPinging(true)
    try {
      setPing(await proxyPing())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('网络探测失败'))
    } finally {
      setPinging(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('远程控制')}
        extra={
          <Button variant="outline" size="icon" onClick={load} aria-label={t('刷新')}>
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-muted-foreground" />
              <span>{t('网络探测：')}</span>
              <StatusBadge state={ping?.internetAccess ? 'online' : 'offline'} />
              {ping?.platform && <span className="text-muted-foreground">（{ping.platform}）</span>}
            </div>
            <Button variant="outline" size="sm" onClick={handlePing} disabled={pinging}>
              <RefreshCw className={pinging ? 'mr-1 size-3.5 animate-spin' : 'mr-1 size-3.5'} />
              {t('重新探测')}
            </Button>
          </div>

          {ping && !ping.internetAccess && (
            <Alert variant="destructive">
              <AlertTitle>{t('无法访问互联网')}</AlertTitle>
              <AlertDescription>
                {t('请检查网络连接。远程控制需要能够访问云端平台服务。')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="text-sm font-medium">{t('代理配置')}</h3>
            <div className="space-y-1.5">
              <Label>{t('目标地址（targetIp）')}</Label>
              <Input
                value={config.targetIp || ''}
                onChange={(e) => setConfig({ ...config, targetIp: e.target.value })}
                placeholder={t('如 192.168.1.100')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('目标端口（targetPort）')}</Label>
                <Input
                  value={config.targetPort || ''}
                  onChange={(e) => setConfig({ ...config, targetPort: e.target.value })}
                  placeholder={t('如 8080')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('服务端口（serverPort）')}</Label>
                <Input
                  value={config.serverPort || ''}
                  onChange={(e) => setConfig({ ...config, serverPort: e.target.value })}
                  placeholder={t('如 443')}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('验证密钥（vkey）')}</Label>
              <Input
                type="password"
                value={config.vkey || ''}
                onChange={(e) => setConfig({ ...config, vkey: e.target.value })}
                placeholder={t('输入验证密钥')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={config.valid} onCheckedChange={(v) => setConfig({ ...config, valid: v })} />
              <Label>{t('配置生效')}</Label>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-1 size-4" />
              {saving ? t('保存中...') : t('保存配置')}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-medium">{t('服务状态与控制')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('当前状态：')}</span>
                <StatusBadge state={config.valid ? 'running' : 'stopped'} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStart} disabled={busy}>
                  <Play className="mr-1 size-4" />
                  {t('启动')}
                </Button>
                <Button variant="destructive" onClick={handleStop} disabled={busy}>
                  <Square className="mr-1 size-4" />
                  {t('停止')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-medium">{t('下载远程客户端')}</h3>
              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label>{t('系统平台')}</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleDownload}>
                  <Download className="mr-1 size-4" />
                  {t('下载客户端')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
