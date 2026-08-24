# KESI 运维管理平台（packages/maintain）国际化（i18n）实施方案

> 文档状态：**已执行（v1.0，执行记录见附录 10.5）**；改编自 `packages/kesi` 已落地方案的 v2.0 执行经验（见附录 10.4）
> 适用项目：`packages/maintain`（React 19 + TypeScript + Vite，HashRouter，@kesi/client 数据层）
> 目标：在不改变现有业务行为的前提下，为整个项目引入可切换的国际化（UI 语言），**新增 10 个目标语言：en / zh-TW / es / hi / ru / fr / ar / de / ja / ko**，默认语言为简体中文（zh-CN）。

---

## 1. 项目现状与规模分析

### 1.1 规模数据（实测统计，2026-08 扫描）

| 指标 | 数值 |
|---|---|
| TS/TSX 源文件总数 | 92 |
| 源码总行数 | ≈15,300 |
| 含中文字符的文件数 | 48（占 52%） |
| 中文字符出现总次数 | ≈5,567 |
| 引号内中文串字面量 | ≈414 |
| JSX 文本节点 / 属性中文值（估算） | ≈149 / ≈100 |
| **UI 文案总量（约）** | **≈650 条** |

结论：**这是一个中文硬编码的中小型项目**，规模约为 kesi 项目的 1/40（kesi：2.3 万条文案 / 1,024 文件）。650 条的量级意味着**无需重型提取工具链**：正则扫描 + 分批人工审校即可，全量改造单人 1 周内可完成。

### 1.2 现有 i18n 相关资产（可直接复用）

1. **`@kesi/client` 已内置语言通道**：`Config.language` 会在请求头携带 `Accept-Language`（`getHeaders()`）。当前在 `src/lib/config.ts` 中**硬编码为 `'zh-CN'`**——改造后只需在语言切换时 `setConfig({ language })` 即可联动后端。
2. **旧版应用翻译资产（金矿）**：`old/src/i18n/en.json` 含 **426 条「中文 → 英文」翻译**，与本项目域高度重合（服务管理、资源统计、日志管理、远程控制、登录、修改密码、通用按钮/提示）；`old/src/i18n/xadmin-trans.json` 另有 107 条框架级翻译。旧版用 i18next + react-i18next，en.json 结构为 `{ translation: { 中文: 英文 } }`——**可直接作为新 en.json 的种子**（见 10.3）。
3. **`index.html`**：`<html lang="zh-CN">` **已正确**（kesi 那版是错的），`<title>运维管理平台</title>` 为静态。
4. **sonner toast 已接入**：`src/lib/config.ts` 把 `@kesi/client` 内部 toast 映射到 sonner，UI 侧统一提示样式。

### 1.3 关键架构事实（决定方案形态）

- **无 schema 驱动 UI（与 kesi 最大的差异）**：本项目不使用 `modelRegistry` / `useModel` / `ViewModel` / `schema-form`，页面通过 `createAPI().fetch` 直连后端，**UI 标签全部写死在页面与组件里**。⇒ kesi 方案的「L3 schema 标签本地化层」**整体不适用**，所有文案都是普通静态文案，提取与替换简单直接。
- **文案分布集中**：`src/lib/api`（76 条，多为错误提示与 toast）+ `src/pages/**`（≈229 条）+ `src/components/**`（≈85 条）占绝对大头；**无 flow 之类的巨型目录**，单文件体量小（见附录 10.2）。
- **动态拼接与后端中文值**：
  - `src/lib/api/client.ts` 的 `errorMessage()` 统一从 `{json._error ?? json.message}` 提取错误文案——错误信息本身来自后端，属「数据」，**不翻译**；页面侧 toast 包装文案才翻。
  - 后端返回的中文状态/枚举值需要映射：服务状态（`安装中/运行中/已停止` 等，见 `use-install-poll.ts`、`service-api.ts`）、日志类型、`serverType` 等——用「值→key 映射表」处理（L4），**不改后端、不改存储值**。
- **非 React 模块也有文案**（必须走单例 `i18n.t`）：
  - `src/lib/api/authInterceptor.ts`（刚装配的全局 401/403 拦截器，toast 中文串）
  - `src/stores/platform.ts`、`src/hooks/use-install-poll.ts`、`src/data/menu.tsx`（菜单 label）
- **第三方库面窄**：echarts（工具提示/时间轴需 `registerLocale`）、`@xterm/xterm`（终端输出为后端数据，**不翻**）、`@tanstack/react-table` / dnd-kit / base-ui / radix（均无内置 UI 文案）、sonner（文案为自研串，随 L2 提取）。**无** handsontable / monaco / react-day-picker / dayjs 直接使用。

---

## 2. 目标与范围

### 2.1 目标

1. 全项目 UI 文案可切换语言（zh-CN ⇄ en），切换即时生效、无需刷新。
2. 保持 zh-CN 为默认语言，且**中文体验与现状完全一致**（零回归）。
3. 建立可长期维护的机制：提取脚本、缺失 key 检查、CI 门禁，后续新增页面默认走 i18n。

### 2.2 范围（In Scope）

- 页面 JSX 静态文案、组件 props 默认文案、toast/confirm 文案。
- 布局与菜单（`src/data/menu.tsx`）、登录/修改密码、`authInterceptor.ts` 的提示文案。
- 后端中文枚举/状态值映射（服务状态、安装进度、日志类型等）。
- `Accept-Language` 随语言切换联动（`setConfig({ language })`）。
- echarts 内置 UI 文案（工具提示/时间轴/图例默认文本）。
- `<html lang>` 动态化、浏览器标题（可选）。

### 2.3 范围（Out of Scope，需明确约定）

- **用户数据不翻译**：服务名称、模块名称、日志正文、安装包版本、终端输出、后端错误消息（`_error`/`message`）等一律原样展示。
- **远程控制终端（xterm）**：内容为实时终端/后端输出，不翻译（与 kesi 的 console 一致）。
- **RTL**：zh/en 均为 LTR，不做 RTL 适配。
- **内容多语言（languageInput）**：本项目不使用 `languageInput` 字段与模型层，无此需求。
- **schema 标签本地化**：本项目无 schema 驱动 UI（见 1.3），kesi 方案的 L3 层不适用。

---

## 3. 技术选型

### 3.1 方案对比（与 kesi 结论一致）

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **i18next + react-i18next**（推荐） | 生态最成熟；React 19 兼容（react-i18next ≥15 / i18next ≥24）；支持插值/复数/嵌套 key、可在非 React 模块中直接调用；渐进式迁移（`defaultValue`）完善；**与旧版 en.json 结构天然兼容** | 非编译期类型安全（可接受） | ✅ 推荐 |
| **Lingui** | 编译期提取、类型友好 | 需改造构建链；对本项目无必要 | 不推荐 |
| **自研 hook + JSON** | 无依赖 | 无插值/懒加载；不必要地重复造轮子 | 不推荐 |

### 3.2 推荐组合

```
i18next ^24 + react-i18next ^15
```

### 3.3 关键决策（直接采用 kesi 落地版策略：「中文即 key」）

1. **key 即中文原文**：
   - 每个文案写成 `t('服务管理')`——key 就是中文原文；
   - `zh-CN` 语言包为空，未命中时 i18next fallback 返回 key 本身 ⇒ **中文环境零 JSON、零性能损耗，切换回中文即现状**；
   - `en.json` 只维护 `{ 中文原文: 英文译文 }`，**可由旧版 `old/src/i18n/en.json` 直接播种 426 条**（结构完全一致）；
   - 优点：**渐进式迁移**——存量文件逐个改，未改到的文件中文体验不变；缺 key 静默回落中文，不破坏功能；**与旧版翻译资产零转换直接复用**。
2. **语言标识**：UI 侧统一 BCP-47；支持 **zh-CN（默认）/ en / zh-TW / es / hi / ru / fr / ar / de / ja / ko** 共 11 种；`setConfig({ language })` 直接传同值，`@kesi/client` 原样放入 `Accept-Language`。
3. **语言持久化**：`localStorage['kesi-ui-lang']`，与现有主题键 `kesi-ui-theme` 风格一致。
4. **非 React 模块**（`authInterceptor.ts` / `stores` / `hooks` / `api`）直接 `import i18n from '@/i18n'` 后 `i18n.t('中文')`，保持单一实例。
5. **不拆 namespace、不做懒加载**：374 条规模单包 `en.json` 即可（各语言包 20~32KB 原始 / gzip 约 6~10KB），无需分包复杂度。

---

## 4. 总体架构设计

### 4.1 Provider 挂载位置

当前入口树（`src/main.tsx`）：

```
ThemeProvider(defaultTheme="light")
  └─ HashRouter
      └─ TooltipProvider
          └─ App（Routes）
          └─ Toaster
```

改造：挂 `I18nextProvider`（或仅模块级 `initReactI18next` + `useLanguageSync` 副作用组件，参照 kesi 落地做法）：

```tsx
// src/main.tsx（改动示意）
<ThemeProvider defaultTheme="light" storageKey="kesi-ui-theme">
  <I18nextProvider i18n={i18n}>       {/* 新增 */}
    <HashRouter>
      <TooltipProvider>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </HashRouter>
  </I18nextProvider>
</ThemeProvider>
```

初始化在模块级完成（`src/i18n/index.ts`），首个语言从 `localStorage` 读取（默认 `zh-CN`），**同步加载**避免首屏闪烁（en.json 仅 ~20KB，无需懒加载）。

### 4.2 语言切换流程（统一入口 `useLocale()`）

```
切换语言 lang
  ├─ i18n.changeLanguage(lang)                    # react-i18next 自动重渲染
  ├─ setConfig({ language: lang })                # @kesi/client 联动 Accept-Language
  ├─ document.documentElement.lang = lang
  ├─ localStorage['kesi-ui-lang'] = lang
  └─ 非 React 模块无缓存问题（i18n.t 每次即时取），无需额外刷新
```

语言切换器 UI：侧边栏 `UserMenu`（追加语言切换项，复用 shadcn `DropdownMenu`）+ 登录页 `LoginPage`（右上角，与主题切换并列）。旧版有「切换语言」入口（en.json 含该词条），交互可参照。

### 4.3 目录结构

```
src/i18n/
  index.ts               # i18next 初始化（模块级，单例；fallbackLng: 'zh-CN'；支持 11 种语言）
  useLocale.ts           # useLocale()：当前语言 + changeLanguage + 持久化 + setConfig 联动
  enumMaps.ts            # 后端中文枚举/状态值 → 翻译映射表（L4）
  echarts-locale.d.ts    # echarts/i18n/* 语言包模块类型声明
  locales/
    en.json zh-TW.json es.json hi.json ru.json fr.json ar.json de.json ja.json ko.json  # { 中文: 译文 }
scripts/
  i18n-extract.mjs       # 存量文案提取脚本（生成 i18n-strings.json 源清单）
  i18n-check.mjs         # 语言包完整性 + 残留中文检查（CI 门禁）
```

### 4.4 语言包结构

单 namespace（`translation`，与旧版 en.json 兼容）；zh-CN 无语言包（key 即中文原文）：

```json
{
  "translation": {
    "服务管理": "Service Management",
    "登录已过期": "Session expired",
    ...
  }
}
```

语言切换器：侧边栏 `UserMenu` 下拉菜单内嵌 11 语言列表 + 登录页右上角独立 `LanguageSwitcher` 组件（`src/components/layout/LanguageSwitcher.tsx`）。

---

## 5. 分层次改造策略（核心）

按依赖关系自底向上分 6 层。每一层给出：改动点、key 规则、工作量（单人口径）。

### L1 基础设施（约 0.5 天）

- 安装 `i18next`、`react-i18next`。
- 新建 `src/i18n/index.ts`：初始化实例，`fallbackLng: 'zh-CN'`，`returnNull: false`，`interpolation.escapeValue: false`（React 自带转义）；加载 `en.json`（动态 import 或静态引入均可）。
- 新建 `src/i18n/useLocale.ts`；`main.tsx` 挂 `I18nextProvider`（或 `useLanguageSync`）。
- `src/lib/config.ts`：`language` 由硬编码 `'zh-CN'` 改为读 `localStorage['kesi-ui-lang']`（默认 zh-CN）。
- `<html lang>` 动态化（切换时更新）。

### L2 静态 UI 文本（主体工作量，约 2~3 天）

把 JSX 中文文本、组件默认 props、toast/confirm 文案替换为 `t()`：

```tsx
// 改前
<PageHeader title="服务管理" description="管理服务的部署与运行" />
toast.success('保存成功');

// 改后
const { t } = useTranslation()
<PageHeader title={t('服务管理')} description={t('管理服务的部署与运行')} />
toast.success(t('保存成功'));
```

规则约定：
- 组件内用 `useTranslation()`；非组件模块（`authInterceptor.ts`、`stores`、`hooks`、`lib/api`）用 `i18n.t('中文')`。
- **纯展示常量**（如 `src/data/menu.tsx` 的菜单 label、`stores/platform.ts` 文案）改为渲染处 `t()`，常量文件只保留中文原文作为 key 来源。
- 变量用插值 `t('确定删除「{{name}}」吗？', { name })`，禁止手工 `+` 拼接。
- 含 HTML 的文案拆分子文案或用 `Trans` 组件。

改造顺序（按依赖与复用度）：`components/layout`（UserMenu/AppLayout/ChangePasswordDialog）→ `pages/auth`（登录/改密）→ `data/menu.tsx` → `components/common`（PageHeader/StatusBadge/UploadDialog 等）→ `pages/service`（最大页面组）→ `pages/logs` → `pages/{dashboard,remote,front,serviceDiagnosis}` → `components/service`。

**特别项**：`src/lib/api/authInterceptor.ts` 的 toast 串（`'登录已过期'`、`'请重新登录'`、`'长时间未操作'`、`'无权限'` 等）改为 `i18n.t('中文')`——该模块无 React 上下文，直接用单例。

### L3 Schema 标签本地化 —— **不适用（删除）**

本项目无 schema 驱动 UI（无 `src/schemas/`、无 `modelRegistry`/`schema-form`/`view-data-table`），表单与表格标签全部为静态 JSX 文案，已由 L2 覆盖。若未来启用 `@kesi/client` 模型组件，再按 kesi 方案的 L3 补充 `localizeSchema` 助手。

### L4 动态拼接文案与后端中文值（约 1 天）

1. **枚举/状态映射表**（`src/i18n/enumMaps.ts`）：后端返回的服务状态（`安装中/运行中/已停止/下载中/升级中` 等）、安装进度状态（`use-install-poll.ts`）、日志类型、`serverType` 等中文值，建 `Record<中文值, 翻译key>`，渲染处 `t(enumMaps[value] ?? value)`。**不改后端、不改存储值**。
2. **API 层 toast 文案**：`src/lib/api/*` 中页面触发的成功/失败提示（`'创建成功'`、`'操作失败'` 等）统一 `t()`；`errorMessage()` 提取的后端错误消息属数据，**不翻译**（保持原样展示）。
3. **模板拼接**：现有 `'服务「{{name}}」{{action}}'` 式拼接统一改为结构化插值，碎片不做 key（与 kesi L4 经验一致：碎片式 key 会让译文无法组句）。

### L5 后端数据联动（并入 L4）

- `useLocale()` 切换时 `setConfig({ language: lang })`，使 `Accept-Language` 随 UI 语言切换（`@kesi/client` 已支持，零额外开发）。
- 本项目无 `languageInput` 内容多语言需求（Out of Scope）。

### L6 第三方库本地化（约 0.5 天）

| 库 | 做法 |
|---|---|
| echarts | `echarts.registerLocale('zh', zhCN)` / `registerLocale('en', en)`，`EChart.tsx` 内各图表 `setOption({ locale })` 或实例级配置（工具提示/时间轴默认中文需跟随） |
| xterm | 终端输出为后端数据，**不翻译**（Out of Scope） |
| @tanstack/react-table / dnd-kit / base-ui / radix | 无内置 UI 文案，无需处理 |
| sonner | 文案均为自研字符串，随 L2 正常提取 |
| dayjs/moment | 本项目源码未直接使用（`@kesi/client` 内部使用，不涉及 UI 展示），无需处理 |

统一封装 `applyThirdPartyLocale(lang)`，在 `useLocale` 切换时调用。

### L7 元数据（并入 L1/L2）

- `<html lang>` 动态化（L1）；`index.html` 已为 `zh-CN`。
- 浏览器标题 `<title>运维管理平台</title>`（静态）——可选改为随语言 `t('运维管理平台')`；本项目无 `document.title` 拼接逻辑（kesi 的 MainLayout 场景不存在）。

---

## 6. 工具链与自动化

### 6.1 存量提取脚本 `scripts/i18n-extract.mjs`

~650 条规模，**无需 babel/ts-morph 重型解析**：

- 正则扫描：JSX 文本节点、`'...'`/`"..."`/模板串中含 CJK 的字面量 → 生成 `key=中文原文 → 中文` 清单；
- 输出 `en.json` 骨架：**先以 `old/src/i18n/en.json` 的 426 条播种**，剩余条目值填 `""` 或 `"__TODO__"`；
- `--apply` 模式把代码改写为 `t('中文')`（幂等，可重复执行）；建议分批执行：`layout/login/common` → `pages/service` → 其余，每批独立 review。
- 同一中文串全项目复用同一 key（天然去重）。

### 6.2 新增代码约束（防回潮）

- `scripts/i18n-check.mjs`：检查 `en.json` 是否存在 `__TODO__` / 空值（允许白名单）；`--strict` 模式扫描源码中**新增** CJK 字面量（跳过 `t('中文')` 包裹与数据层白名单）。
- 可选：ESLint 自定义规则 `no-hardcoded-chinese`（flat config 自写一条）。**注意**：本项目无 lint 脚本，且 `typescript-eslint` 与 TS 7 存在兼容问题（kesi 同款环境问题），**建议以 `i18n:check --strict` 作为替代门禁**，不引入 lint 依赖。
- i18next 开发模式 `missingKeyHandler` 打 console 警告，方便本地发现漏翻。

### 6.3 对现有测试的影响

本项目**无 e2e / 单测基建**（package.json 仅有 dev/build/preview/typecheck），无测试回归风险。门禁 = `pnpm typecheck` + `pnpm build` + `i18n:check --strict`。

---

## 7. 实施路线图

### 7.1 阶段划分（单人串行口径）

| 阶段 | 内容 | 预估工期 | 依赖 |
|---|---|---|---|
| P0 | 本方案评审与定稿 | 0.5 天 | — |
| P1 | L1 基础设施 + 语言切换器（UserMenu/登录页）+ html lang + setConfig 联动 | 0.5~1 天 | P0 |
| P2 | L2 公共层：layout、menu、login、changePassword、common 组件、通用 toast、authInterceptor 文案 | 1 天 | P1 |
| P3 | L2 页面主体：pages/service → pages/logs → dashboard/remote/front/serviceDiagnosis | 1.5~2 天 | P1 |
| P4 | L4/L5：enumMaps + API 层文案 + Accept-Language 核对 | 0.5~1 天 | P2 |
| P5 | L6 echarts locale + en.json 播种与审校 + i18n-check | 0.5 天 | P2 |
| P6 | 验收打磨：缺失 key 审计、build/typecheck、文档 | 0.5 天 | P2~P5 |

**单人总计约 4~6 天（≈1 周）；两人并行可压到 3 天。**

### 7.2 优先级与 80/20 MVP

若时间紧张，先交付「可上线的最小闭环」（约 2~3 天）：

1. P1 + P2（布局/登录/菜单/公共组件/通用 toast 全量英文）；
2. `pages/service`（服务管理，运维主场景）+ `pages/logs` 高频页；
3. 后端状态值映射（服务状态/安装进度，用户最常看到的中文数据）。

### 7.3 分工建议（按目录切分，避免冲突）

- 组 A：`src/pages/service/**` + `src/components/service/**`（最大块）
- 组 B：`src/pages/logs/**` + `src/pages/dashboard/**` + `src/components/common/**`
- 组 C：`src/components/layout/**` + `src/pages/auth/**` + `src/data/**` + `src/lib/**` + `src/stores/**` + `src/hooks/**`（含 authInterceptor）
- 组 D：`src/pages/{remote,front,serviceDiagnosis}/**` + 收尾审校

每批完成标准：目录内文件无未包裹 CJK 字面量（除白名单），`en.json` 对应条目无 `__TODO__`。

---

## 8. 风险与规避

| # | 风险 | 影响 | 规避 |
|---|---|---|---|
| 1 | 旧版 en.json 部分翻译为直译/机翻质量差（如 `'周': 'Circumference'`、`'月': 'The moon'`） | 中 | 旧版仅作**种子**，启用前逐条人工审校；高风险词条（周期/时间单位等）重点 review |
| 2 | 动态拼接文案碎片化，译文无法组句 | 中 | 整句结构化插值重构（L4），碎片不做 key |
| 3 | 后端返回中文状态值被误当文案翻译 | 中 | 枚举→key 映射表统一收敛（L4），Out of Scope 清单明确（数据不翻） |
| 4 | 模块级常量在语言切换后不重求值（`data/menu.tsx` 等） | 低 | 常量文件只保留中文原文，渲染处 `t()`；本项目此类点少，逐个确认 |
| 5 | `authInterceptor` 等非 React 模块漏改 | 低 | 明确走单例 `i18n.t`；L2 清单点名该文件 |
| 6 | 中文作为 key，后续改中文文案导致旧译文失配 | 低 | 中文文案变更时同步更新 en.json 对应条目（i18n-check 提示缺失即可发现） |
| 7 | `Accept-Language` 切换后后端按语言返回内容差异 | 低 | 本项目后端内容多为中文数据（不翻译），联动仅影响请求头，无数据风险 |
| 8 | en 语言包体积 | 低 | ~650 条单包 gzip 约 10~15KB，无需分包 |

---

## 9. 验收标准（Checklist）

- [x] 布局、菜单、登录、服务管理、日志等全部页面在 zh-CN / en / zh-TW / es / hi / ru / fr / ar / de / ja / ko 间切换，**无需刷新**即时生效，切换后刷新仍保持（localStorage 持久化）。
- [x] 默认 zh-CN 时，**全部现有页面文案与改造前逐字一致**（零回归，key 即中文原文）。
- [x] 菜单、`UserMenu`、登录页、修改密码页、`authInterceptor` toast 在非中文语言下为对应语言。
- [x] 服务状态、安装进度、日志类型等**后端中文值**经映射表本地化。
- [x] `Accept-Language` 请求头随语言切换。
- [x] echarts 图表工具提示语言随切换（hi 回退 en、zh-TW 用 zh 语言包）。
- [x] `<html lang>` 随切换更新。
- [x] 10 个语言包无缺失 key（`pnpm i18n:check --strict` 通过）。
- [x] 源码无未包裹的 CJK 字面量残留（白名单 key 常量文件除外）。
- [x] `pnpm typecheck`、`pnpm build` 通过。

---

## 10. 附录

### 10.1 关键文件清单

| 文件/目录 | 与 i18n 的关系 |
|---|---|
| `src/main.tsx` | Provider 挂载位置（I18nextProvider） |
| `src/lib/config.ts` | `language: 'zh-CN'` 硬编码，改读持久化语言 |
| `src/data/menu.tsx` | 菜单 label（≈10 条，渲染点在 AppLayout） |
| `src/components/layout/AppLayout.tsx` | 侧边栏/面包屑渲染菜单 label（`item.title`） |
| `src/components/layout/UserMenu.tsx` | 用户名/退出/修改密码文案 + 语言切换器入口 |
| `src/pages/auth/LoginPage.tsx` | 登录页文案（表单/提示/按钮） |
| `src/pages/auth/ChangePasswordPage.tsx` | 修改密码页文案 |
| `src/lib/api/authInterceptor.ts` | 全局 401/403 拦截器 toast 中文串（非 React 模块） |
| `src/lib/api/*` | API 层成功/失败 toast 文案（76 条） |
| `src/hooks/use-install-poll.ts` | 安装进度状态文案（后端中文值映射） |
| `src/stores/platform.ts` | 平台信息文案 |
| `src/components/common/*` | PageHeader/StatusBadge/UploadDialog/InstallProgress 等通用文案 |
| `src/components/common/EChart.tsx` | echarts 实例（locale 注入点） |
| `old/src/i18n/en.json` / `xadmin-trans.json` | **旧版翻译资产，en.json 种子（426+107 条）** |

### 10.2 存量文案分布（实测，供排期参考）

| 目录 | 中文串字面量（约） |
|---|---|
| `src/lib/api` | 76 |
| `src/pages/service` | 71 |
| `src/pages/logs` | 43 |
| `src/components/common` | 40 |
| `src/pages/auth` | 38 |
| `src/pages/remote` | 27 |
| `src/components/layout` | 24 |
| `src/pages/front` | 21 |
| `src/pages/dashboard` | 17 |
| `src/components/service` | 16 |
| `src/pages/serviceDiagnosis` | 12 |
| `src/data` | 10 |
| `src/hooks` | 6 |
| `src/stores` | 3 |
| 其余（src 根、src/lib） | 5 |
| **合计** | **≈414（引号内）＋ JSX 文本/属性 ≈250 ≈ 650 条** |

### 10.3 旧版翻译资产复用说明（重要）

- `old/src/i18n/en.json`：**426 条**，结构 `{ translation: { '中文': '英文' } }`——与新方案「中文即 key」的 en.json 结构**完全一致**，可整包播种后按需增补。
- 覆盖范围与本项目高度重合：菜单（服务管理/资源统计/日志管理/远程控制）、登录（用户名/密码/记住我/修改密码）、通用按钮（保存/删除/确认/取消）、服务管理（添加服务/部署/启动/停止/重启/批量操作）、日志（查询/导出/清除）、远程控制、状态值（已创建/暂停/重启中/正在删除/在使用）等。
- `old/src/i18n/xadmin-trans.json`：107 条 xadmin 框架级翻译（Actions/Add/Back…），仅少量可直接复用。
- **质量提示**：旧翻译为早期直译/机翻，部分词条质量差（如 `'周': 'Circumference'`、`'月': 'The moon'`、`'导出': '“export”'），复用前需逐条人工审校，可作为种子而非最终译文。

### 10.4 与 packages/kesi 已落地方案的差异（本方案改编依据）

| 维度 | packages/kesi（已执行 v2.0） | packages/maintain（本方案） |
|---|---|---|
| 规模 | 1,024 文件 / 2.3 万条文案 | 92 文件 / ≈650 条文案 |
| 语言策略 | 落地版采用「中文即 key」 | **直接沿用「中文即 key」** |
| schema 本地化（L3） | 有（view-data-table/schema-form/form-field-converter） | **无 schema 驱动 UI，删除该层** |
| namespace | 多 namespace 分包（flow/iot/business/…） | 单 namespace，无分包 |
| 巨型目录 | flow（6,300 串）需独立 namespace 与分工 | 无；最大目录 pages/service 仅 71 条 |
| 三方库 | handsontable/monaco/dayjs/react-day-picker/echarts 等 | 仅 echarts（其余不适用或为数据不翻） |
| 翻译资产 | 无历史资产，en.json 从零翻译 | **old/src/i18n/en.json 426 条可直接播种** |
| 提取工具 | babel codemod（648 文件/万级替换） | 正则脚本即可（650 条） |
| 测试基建 | Playwright e2e（需固定 zh-CN） | 无测试基建，无回归风险 |
| 工期 | 8~12 周（多人） | 4~6 人日（单人约 1 周） |

---

### 10.5 执行记录（v1.0，已执行）

> 按本方案 L1→L7 完成执行。最终策略：**「中文即 key」**（`t('中文原文')`，key 即中文原文；zh-CN 无语言包，未命中返回 key），**新增 10 个语言包：en / zh-TW / es / hi / ru / fr / ar / de / ja / ko**（未复用 `old/` 目录翻译，全部重新翻译）。

#### 落地清单

| 层 | 内容 | 状态 |
|---|---|---|
| L1 基础设施 | `src/i18n/`（index/useLocale/enumMaps/echarts-locale.d.ts）；`main.tsx` 挂 `I18nextProvider`；`config.ts` language 读 `localStorage['kesi-ui-lang']`；`<html lang>` 动态化 | ✅ |
| L2 静态文案 | 全量代码改造：**约 45 个文件**（layout/auth/data/api/hooks/stores + 全部页面 + 公共组件）的 JSX 文本/属性/toast 改为 `t()`；菜单（`data/menu.tsx`）、`authInterceptor.ts`、`StatusBadge`/`STAGE_LABEL` 等经渲染点 `t()` 化 | ✅ |
| L3 schema 标签 | 不适用（本项目无 schema 驱动 UI） | — |
| L4 动态文案 | `enumMaps.ts` 后端状态值映射；`service-api`/`upload-api`/`client` 错误文案；周期模板 `{{cycle}} {{unit}}` 结构化插值 | ✅ |
| L5 后端数据 | `Accept-Language` 随语言切换（`setConfig({ language })`） | ✅ |
| L6 三方库 | echarts 6 `registerLocale` + `init({ locale })`，11 语言映射（hi 回退 EN、zh-TW 用 ZH）；xterm 不翻 | ✅ |
| L7 元数据 | `<html lang>` 动态化；浏览器标题保持静态（无 document.title 拼接逻辑） | ✅ |

#### 关键数字

- **语言包：10 个**（en/zh-TW/es/hi/ru/fr/ar/de/ja/ko），每个 **374 条**（源码 `t()` key 327 条 + 预留），与源码 key **缺失 0**
- `pnpm typecheck`、`pnpm build` 通过；`pnpm i18n:check --strict` 0 问题（残留中文 0）
- 语言包体积：单包 20~32KB 原始 / gzip 约 6~10KB，11 语言合计约 236KB 原始（静态引入，无分包）

#### 工具链（scripts/）

| 脚本 | 用途 |
|---|---|
| `i18n-extract.mjs` | 扫描源码中文串字面量 → `i18n-strings.json` 源清单 |
| `i18n-check.mjs` | 语言包完整性（缺失 key）+ 残留硬编码中文扫描（`--strict` 可阻断，跳过注释/console/白名单 key 文件） |
| package.json | `pnpm i18n:check`、`pnpm i18n:extract` |

#### 已知边界与后续建议

1. **数据不翻译**：服务名、日志正文、版本号、后端错误消息（`_error`/`message`）、xterm 终端输出等数据串保持原样（正确行为）。
2. **echarts 语言覆盖**：hi（印地语）echarts 无语言包回退英文；zh-TW 使用简体中文语言包（echarts 无繁体包）。
3. **翻译质量**：10 语言由专业译员按运维场景风格翻译；`hi`/`ar` 等小语种建议上线前由母语者抽查。
4. **防回潮**：新增代码请使用 `t('中文')`；CI 建议加入 `pnpm i18n:check -- --strict` 门禁。
5. **性能优化**（可选）：语言包按需懒加载可再降主包约 100KB 原始体积，当前静态引入可接受。
