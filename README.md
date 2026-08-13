# iot-maintain — Ops/Maintenance Management Platform

A web-based operations and maintenance (O&M) management platform for an IoT platform deployment. It lets operators manage services and modules, monitor host resources in real time, diagnose services, browse operation and service logs, control remote instances, and configure the platform — all through a single dashboard.

Built as a full rewrite of the legacy maintenance console on a modern stack: Vite + React + TypeScript, the `@kesi/client` SDK, shadcn/ui with reui data-grid tables, and ECharts dashboards. **All API endpoints remain unchanged from the legacy system.**

## Features

- **Dashboard (首页)** — service/module counts, running status, online one-click upgrade, offline batch upgrade, and update logs.
- **Service Management (服务管理)** — list, create, edit, delete, start/stop/restart services; per-service logs, stats, inspection, web console, online/offline upgrade, and deployment file editing.
- **Module Management (模块管理)** — list and manage deployable modules.
- **Resource Statistics (资源统计)** — real-time CPU, memory and disk usage with ECharts gauges and usage-level coloring.
- **Service Diagnosis (服务诊断)** — health checks across services.
- **Log Management (日志管理)** — operation logs, ops (maintenance) logs, and service (PM2) logs.
- **Remote Control (远程控制)** — control remote hosts.
- **System Settings (系统设置)** — project configuration; change password.

## Tech Stack

| Layer | Tech |
| --- | --- |
| Build | [Vite 7](https://vite.dev/) |
| Framework | [React 19](https://react.dev/) + TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives) |
| Tables | [TanStack Table v9](https://tanstack.com/table) + reui data-grid (`@/components/reui/data-grid`) |
| Charts | [ECharts 6](https://echarts.apache.org/) |
| State | [Jotai](https://jotai.org/) |
| Data / Auth | [`@kesi/client`](https://www.npmjs.com/package/@kesi/client) SDK |
| Routing | [React Router 7](https://reactrouter.com/) (HashRouter) |
| Terminal | xterm.js (service console) |
| Notifications | sonner |

## Getting Started

```bash
# install dependencies
npm install          # if npm ERESOLVE is hit, use: npm install --legacy-peer-deps

# start dev server (http://localhost:3000)
npm run dev

# type-check
npm run typecheck

# production build (outputs to build/)
npm run build

# preview the production build
npm run preview
```

## Configuration

The backend API base URL is configured through the `.env` file:

```
# Backend API proxy target (development)
VITE_API_PROXY=http://iot-server:13030/
```

In development, `/api` requests are proxied to `VITE_API_PROXY` (fallback `http://iot-server:13030/`). In production the API is same-origin. All API paths match the legacy system exactly.

## Project Structure

```
src/
  App.tsx                      # routing (HashRouter) + protected routes
  main.tsx                     # entry: theme provider, router, tooltip provider, toaster
  lib/                         # @kesi/client config + per-domain API modules
  stores/                      # Jotai atoms (platform/server info, versions)
  data/menu.tsx                # sidebar menu config
  components/
    layout/                    # AppLayout, UserMenu, ChangePasswordDialog
    common/                    # DataTable, PageHeader, EChart, dialogs, upload
    reui/data-grid/            # data-grid table primitives
    ui/                        # shadcn/ui primitives
  pages/
    auth/                      # LoginPage, ChangePasswordPage
    dashboard/                 # DashboardPage, ResourceStatisticsPage
    service/                   # ServiceListPage, EditServicePage, logs/stats/console...
    modular/                   # ModularListPage
    log/                       # OperationLogPage, OpsLogPage, Pm2LogPage
    remoteControl/             # RemoteControlPage
    serviceDiagnosis/          # ServiceDiagnosisPage
    system/                    # ProjectConfigPage
old/                           # extracted legacy code (for reference only)
```

---

## 中文说明

**iot-maintain — 运维管理平台**

面向 IoT 平台部署的一站式运维管理平台，提供服务/模块管理、主机资源实时监控、服务诊断、日志查看、远程控制与系统配置等功能。

本项目基于现代化技术栈对旧运维控制台进行**全面重构**，采用 Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + `@kesi/client`，表格统一使用 reui data-grid（基于 TanStack Table v9），图表使用 ECharts。**所有 API 调用地址与旧系统保持一致。**

主要功能：

- **首页**：服务/模块统计、运行状态、一键在线升级、一键离线升级、更新日志
- **服务管理**：服务增删改查、启动/停止/重启、日志、图表、检查、控制台、在线/离线升级、部署文件编辑
- **模块管理**：可部署模块的列表与管理
- **资源统计**：CPU、内存、磁盘实时使用率，ECharts 仪表盘按使用率变色
- **服务诊断**：全服务健康检查
- **日志管理**：操作日志、运维日志、服务管理（PM2）日志
- **远程控制**：远程主机管理
- **系统设置**：项目配置、修改密码

快速开始：

```bash
npm install        # 如遇 npm ERESOLVE，使用 npm install --legacy-peer-deps
npm run dev        # 开发服务器 http://localhost:3000
npm run build      # 生产构建，输出到 build/
```

后端地址通过 `.env` 中的 `VITE_API_PROXY` 配置（开发环境代理 `/api`，生产环境同源）。
