import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getConfig } from '@kesi/client'
import { toast } from 'sonner'
import { AlertTriangle, PlugZap } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { AttachAddon } from '@xterm/addon-attach'
import '@xterm/xterm/css/xterm.css'

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
import { containerExec } from '@/lib/api/service-api'

/** 控制台内容（供页面 / 操作对话框复用）。 */
export function ServiceConsoleContent({ pod, back = false }: { pod: string; back?: boolean }) {
  const [cmd, setCmd] = useState('/bin/bash')
  const [tty, setTty] = useState(false)
  const [user, setUser] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [cmd0, setCmd0] = useState('')

  const termRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<Terminal | null>(null)

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      terminalRef.current?.dispose()
    }
  }, [])

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pod) {
      toast.warning('缺少 podName 参数')
      return
    }
    if (!cmd || !user) {
      toast.info('请填写命令和用户')
      return
    }
    setConnecting(true)
    try {
      const execBody = {
        attachStderr: true,
        attachStdin: true,
        attachStdout: true,
        cmd: cmd.split(' ').filter(Boolean),
        tty,
        user,
      }
      const { Id } = await containerExec(pod, execBody)
      const token = getConfig().user?.accessToken
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const wsUrl = `${proto}://${window.location.host}/api/websocket/exec?id=${Id}&token=${token}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setCmd0(execBody.cmd[0] || '')
        const term = new Terminal({ fontSize: 14, cursorBlink: true })
        terminalRef.current = term
        const fit = new FitAddon()
        term.loadAddon(fit)
        const attach = new AttachAddon(ws)
        term.loadAddon(attach)
        if (termRef.current) {
          term.open(termRef.current)
          fit.fit()
        }
        term.focus()
      }
      ws.onclose = () => {
        setConnected(false)
        setConnecting(false)
        terminalRef.current?.dispose()
        terminalRef.current = null
      }
      ws.onerror = () => {
        toast.error('WebSocket 连接失败')
        setConnected(false)
        setConnecting(false)
      }
    } catch (e: any) {
      setConnecting(false)
      toast.error(e?.json?._error || e?.message || '连接失败')
    }
  }

  const disconnect = () => {
    wsRef.current?.close()
    setConnected(false)
    setConnecting(false)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`控制台：${pod}`}
        back={back}
        extra={
          connected && (
            <Button variant="destructive" onClick={disconnect}>
              <PlugZap className="mr-1 size-4" />
              断开连接
            </Button>
          )
        }
      />

      {connected && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>正在使用控制台</AlertTitle>
          <AlertDescription>
            用户 <span className="font-medium">{user}</span> 在使用 <span className="font-medium">{cmd0}</span> 命令
          </AlertDescription>
        </Alert>
      )}

      {!connected ? (
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <form onSubmit={connect} className="space-y-4">
              <div className="space-y-1.5">
                <Label>命令</Label>
                {tty ? (
                  <Select value={cmd} onValueChange={setCmd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/bin/ash">/bin/ash</SelectItem>
                      <SelectItem value="/bin/bash">/bin/bash</SelectItem>
                      <SelectItem value="/bin/sh">/bin/sh</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="/bin/bash" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={tty} onCheckedChange={setTty} id="tty" />
                <Label htmlFor="tty">使用固定命令</Label>
              </div>
              <div className="space-y-1.5">
                <Label>用户</Label>
                <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="root" />
              </div>
              <Button type="submit" className="w-full" disabled={connecting}>
                {connecting ? '连接中...' : '连接'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div ref={termRef} className="h-[480px] w-full rounded-md bg-black p-2" />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ServiceConsolePage() {
  const [params] = useSearchParams()
  const pod = params.get('podName') || ''
  return <ServiceConsoleContent pod={pod} back />
}
