import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { UploadCloud } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/common/PageHeader'
import { UploadDialog } from '@/components/common/UploadDialog'
import { ProgressDialog } from '@/components/common/ProgressDialog'
import { ServiceForm } from '@/components/service/ServiceForm'
import { serverInfoAtom, newVersionsAtom, getPackageUrl, getUrls } from '@/stores/platform'
import { listServices, createService, updateService, onlineInstall, type ServiceItem } from '@/lib/api/service-api'
import { offlineInstallService } from '@/lib/api/upload-api'

export default function EditServicePage() {
  const navigate = useNavigate()
  const params = useParams<{ name?: string }>()
  const { t } = useTranslation()
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
      toast.warning(t('无对应服务安装包'))
      return
    }
    setInstallingRepo(repoName)
    try {
      const { id } = await onlineInstall(pkg)
      setProgressId(id)
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('安装失败'))
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={editName ? t('编辑服务：{{name}}', { name: editName }) : t('添加服务')} back onBack={backToList} />

      {!editName ? (
        <Tabs defaultValue="online">
          <TabsList>
            <TabsTrigger value="online">{t('在线添加')}</TabsTrigger>
            <TabsTrigger value="offline">{t('离线添加')}</TabsTrigger>
            <TabsTrigger value="high">{t('高级添加')}</TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder={t('搜索服务名称/描述')}
                    value={onlineSearch}
                    onChange={(e) => setOnlineSearch(e.target.value)}
                  />
                </div>
                {onlineCards.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">{t('暂无可用在线服务')}</p>
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
                              {rel?.description || t('暂无描述')}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {rel?.create_time
                                  ? t('更新于 {{time}}', { time: new Date(rel.create_time).toLocaleDateString('zh-CN') })
                                  : ''}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleOnlineInstall(r.repo_name || '')}
                                disabled={installingRepo === r.repo_name}
                              >
                                {installingRepo === r.repo_name ? t('安装中...') : t('安装')}
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
                <p className="text-sm text-muted-foreground">{t('上传离线安装包（.gz / .zip）')}</p>
                <Button onClick={() => setUploadOpen(true)}>
                  <UploadCloud className="mr-1 size-4" />
                  {t('选择文件')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="high" className="mt-4">
            <ServiceForm
              isWin={isWin}
              submitText={t('创建')}
              onSubmit={async (payload) => {
                await createService(payload)
                toast.success(t('新增服务成功'))
                backToList()
              }}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ServiceForm
          isWin={isWin}
          submitText={t('保存')}
          initial={editing}
          onSubmit={async (payload) => {
            await updateService(editName, payload)
            toast.success(t('修改服务成功'))
            backToList()
          }}
        />
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title={t('离线添加服务')}
        accept={isWin ? '.zip' : '.gz,.zip'}
        onUpload={async (file) => {
          await offlineInstallService(urls.url4, file)
          toast.success(t('离线安装已提交'))
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
        title={t('安装进度')}
        installId={progressId}
        onSuccess={() => {}}
      />
    </div>
  )
}
