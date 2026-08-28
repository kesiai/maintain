import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { useUser } from '@kesi/client'

import { Skeleton } from '@/components/ui/skeleton'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import InitAdminPage from '@/pages/auth/InitAdminPage'
import { redirectToInitIfNoAdmin } from '@/lib/api/auth-api'

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ResourceStatisticsPage = lazy(() => import('@/pages/dashboard/ResourceStatisticsPage'))
const ServiceListPage = lazy(() => import('@/pages/service/ServiceListPage'))
const EditServicePage = lazy(() => import('@/pages/service/EditServicePage'))
const ServiceLogPage = lazy(() => import('@/pages/service/ServiceLogPage'))
const ServiceStatsPage = lazy(() => import('@/pages/service/ServiceStatsPage'))
const ServiceInspectPage = lazy(() => import('@/pages/service/ServiceInspectPage'))
const ServiceConsolePage = lazy(() => import('@/pages/service/ServiceConsolePage'))
const ServiceDeployPage = lazy(() => import('@/pages/service/ServiceDeployPage'))
const OperationLogPage = lazy(() => import('@/pages/logs/OperationLogPage'))
const OpsLogPage = lazy(() => import('@/pages/logs/OpsLogPage'))
const Pm2LogPage = lazy(() => import('@/pages/logs/Pm2LogPage'))
const RemoteControlPage = lazy(() => import('@/pages/remote/RemoteControlPage'))
const ServiceDiagnosisPage = lazy(() => import('@/pages/serviceDiagnosis/ServiceDiagnosisPage'))
const FrontManagePage = lazy(() => import('@/pages/front/FrontManagePage'))
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'))

/** 应用启动：检查管理员初始化、移除启动加载动画（登录态恢复已在 initConfig 渲染前完成） */
function Bootstrap() {
  useEffect(() => {
    // 系统未初始化管理员时跳转初始化页 /init（对齐旧版 /user/admin/check 404 → /regest）
    void redirectToInitIfNoAdmin()
    const loader = document.getElementById('loader-wrapper')
    if (loader) {
      loader.style.transition = 'opacity 0.3s'
      loader.style.opacity = '0'
      setTimeout(() => loader.remove(), 350)
    }
  }, [])
  return null
}

/** 未登录跳转登录页 */
function ProtectedRoute() {
  const { user } = useUser()
  if (!user?.token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function PageFallback() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Bootstrap />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/init" element={<InitAdminPage />} />
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="resourceStatistics" element={<ResourceStatisticsPage />} />
              <Route path="model/Service/list" element={<ServiceListPage />} />
              <Route path="model/Service/add" element={<EditServicePage />} />
              <Route path="model/Service/:name/edit" element={<EditServicePage />} />
              <Route path="model/Service/log" element={<ServiceLogPage />} />
              <Route path="model/Service/stats" element={<ServiceStatsPage />} />
              <Route path="model/Service/winStats" element={<ServiceStatsPage />} />
              <Route path="model/Service/inspect" element={<ServiceInspectPage />} />
              <Route path="model/Service/console" element={<ServiceConsolePage />} />
              <Route path="model/Service/depolyment" element={<ServiceDeployPage />} />
              <Route path="model/Log/list" element={<OperationLogPage />} />
              <Route path="log/operation" element={<OpsLogPage />} />
              <Route path="log/pm2" element={<Pm2LogPage />} />
              <Route path="model/RemoteControl/list" element={<RemoteControlPage />} />
              <Route path="serviceDiagnosis" element={<ServiceDiagnosisPage />} />
              <Route path="front" element={<FrontManagePage />} />
              <Route path="changePassword" element={<ChangePasswordPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
