import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { getYml, saveYml } from '@/lib/api/service-api'

export default function ServiceDeployPage() {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setText(await getYml())
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('获取部署文件失败'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveYml(text)
      toast.success(t('保存成功'))
    } catch (e: any) {
      toast.error(e?.json?._error || e?.message || t('保存失败'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('编辑部署文件')}
        back
        extra={
          <>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label={t('刷新')}>
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="mr-1 size-4" />
              {saving ? t('保存中...') : t('保存')}
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground">{t('加载中...')}</p>
          ) : (
            <Textarea
              rows={25}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-black font-mono text-xs leading-5 text-green-400"
              spellCheck={false}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
