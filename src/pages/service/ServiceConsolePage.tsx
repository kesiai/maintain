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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { containerExec } from '@/lib/api/service-api'

const PRESET_COMMANDS = ['/bin/ash', '/bin/bash', '/bin/sh']

/** 控制台内容（供页面 / 操作对话框复用）。 */
export function ServiceConsoleContent({
  pod,
  back = false,
  onConnectedChange,
}: {
  pod: string
  back?: boolean
  /** 连接状态变化回调（供对话框在已连接时阻止 ESC / 点击外部误关） */
  onConnectedChange?: (connected: boolean) => void
}) {
  const [cmd, setCmd] = useState('/bin/bash')
  const [user, setUser] = useState('')
  const [selectOpen, setSelectOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [cmd0, setCmd0] = useState('')

  const termRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  /** 是否为用户主动断开（主动断开不弹错误提示） */
  const intentionalCloseRef = useRef(false)
  /** onerror 是否已提示（避免 onclose 再补一条重复提示） */
  const errorShownRef = useRef(false)

  // 组件卸载时清理 WS 与终端（卸载触发的断开视为主动断开，不弹错误提示）
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true
      wsRef.current?.close()
      terminalRef.current?.dispose()
    }
  }, [])

  // 向父级上报连接状态（对话框据此在已连接时阻止 ESC / 点击外部误关）
  useEffect(() => {
    onConnectedChange?.(connected)
  }, [connected, onConnectedChange])

  // connected 变为 true 后才挂载终端：此时终端容器已渲染、termRef 可用，
  // 否则在 ws.onopen 里立即 open 会因为容器还没渲染而无光标、无法输入。
  useEffect(() => {
    if (!connected) return
    const ws = wsRef.current
    const el = termRef.current
    if (!ws || !el) return
    const term = new Terminal({ fontSize: 14, cursorBlink: true, cursorStyle: 'block', convertEol: true })
    terminalRef.current = term
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new AttachAddon(ws))
    term.open(el)
    fit.fit()
    term.focus()
    return () => {
      term.dispose()
      terminalRef.current = null
    }
  }, [connected])

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
    intentionalCloseRef.current = false
    errorShownRef.current = false
    try {
      const execBody = {
        attachStderr: true,
        attachStdin: true,
        attachStdout: true,
        cmd: cmd.split(' ').filter(Boolean),
        tty: true,
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
      }
      ws.onerror = () => {
        errorShownRef.current = true
        toast.error('WebSocket 连接失败')
        setConnecting(false)
      }
      ws.onclose = (ev) => {
        // 已连接后意外断开：给出错误码 / 原因提示
        if (!intentionalCloseRef.current && !errorShownRef.current) {
          const reason = ev?.reason?.trim()
          toast.error(reason ? `连接已断开：${reason}` : `连接已断开（错误码 ${ev?.code ?? '未知'}）`)
        }
        setConnected(false)
        setConnecting(false)
      }
    } catch (e: any) {
      setConnecting(false)
      toast.error(e?.json?._error || e?.message || '连接失败')
    }
  }

  const disconnect = () => {
    intentionalCloseRef.current = true
    wsRef.current?.close()
    setConnected(false)
    setConnecting(false)
  }

  return (
    <div className="space-y-4">
      <PageHeader title={`控制台：${pod}`} back={back} />

      {connected && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" />
            <span className="truncate">
              用户 <span className="font-medium">{user}</span> 正在使用{' '}
              <span className="font-medium">{cmd0}</span> 命令
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={disconnect}>
            <PlugZap className="mr-1 size-4" />
            断开连接
          </Button>
        </div>
      )}

      {!connected ? (
        <form onSubmit={connect} className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-sm">命令</Label>
            <Select value={cmd} onValueChange={setCmd} open={selectOpen} onOpenChange={setSelectOpen}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择命令" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_COMMANDS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                {cmd && !PRESET_COMMANDS.includes(cmd) && <SelectItem value={cmd}>{cmd}</SelectItem>}
                <div className="border-t p-2">
                  <Input
                    placeholder="自定义命令，输入后回车"
                    defaultValue=""
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = (e.target as HTMLInputElement).value.trim()
                        if (v) setCmd(v)
                        setSelectOpen(false)
                      }
                    }}
                  />
                </div>
              </SelectContent>
            </Select>
          </div>
          <div className="w-64 space-y-1.5">
            <Label className="text-sm">用户</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="root" />
          </div>
          <Button type="submit" className="shrink-0" disabled={connecting}>
            {connecting ? '连接中...' : '连接'}
          </Button>
        </form>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-black">
          <div ref={termRef} className="h-[480px] w-full" />
        </div>
      )}
    </div>
  )
}

export default function ServiceConsolePage() {
  const [params] = useSearchParams()
  const pod = params.get('podName') || ''
  return <ServiceConsoleContent pod={pod} back />
}
