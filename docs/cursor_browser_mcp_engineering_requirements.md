# 登录态人机协同 Browser MCP Server

---

# 1. 项目背景

在实际开发中，很多关键上下文只存在于 **登录后网页** 中，例如：

- SaaS 管理后台
- CRM / ERP / BI 系统
- 运营后台
- 财务、客服、工单、审批系统
- 需要 SSO / MFA / 验证码 / 扫码登录的网站
- 只有登录后才能查看的表格、详情页、导出页、配置页

传统代码助手通常只能访问：

- 本地代码仓库
- 公共网页
- 用户显式提供的接口文档、页面描述、截图

因此在以下开发任务中经常不准确：

- 生成登录后页面相关的自动化脚本
- 生成 Playwright / E2E 测试
- 理解真实 DOM、表格结构、表单结构和交互流程
- 从登录后页面提取结构化数据
- 分析页面行为并生成接口调用或抓取逻辑
- 基于真实页面状态生成调试代码、解析代码、测试代码

本项目需要实现一个 **Browser MCP Server**，供 Cursor 等支持 MCP 的客户端接入。该服务用于：

1. 控制浏览器打开目标网站
2. 在遇到登录、MFA、验证码、扫码等场景时暂停并请求用户人工接管
3. 在用户完成登录后恢复自动化流程
4. 读取登录后页面的结构化信息
5. 提取页面数据，返回给 LLM 作为代码生成上下文
6. 基于当前页面和交互历史生成开发辅助内容，例如 Playwright 脚本、页面对象模型、数据 schema

该系统定位是：

**一个面向开发辅助场景的、人机协同的、支持登录后网页访问的 Browser MCP Server。**

边界要求：

- 不实现验证码破解
- 不实现 2FA 绕过
- 不实现明文账号密码托管
- 不实现规避权限、风控或服务条款的能力
- 默认只服务于用户有权限访问的网站

---

# 2. 工程目标

实现一个可运行的 TypeScript 项目，满足以下最低目标：

- 作为标准 MCP Server 启动
- 可被 Cursor 连接和调用
- 能创建浏览器会话并控制页面
- 能在需要登录时显式暂停，等待人工处理
- 能保存和复用登录态
- 能读取页面结构化摘要
- 能提取文本、表格、表单
- 能生成面向开发的脚本与 schema 输出

---

# 3. 建议技术栈

## 3.1 必选

- Node.js 20+
- TypeScript
- Playwright
- 官方或兼容 MCP TypeScript SDK
- Zod（用于 tool schema / config schema / runtime validation）
- pino 或同类结构化日志库

## 3.2 可选

- fs-extra
- uuid
- yaml
- lowdb / SQLite（后续扩展）

## 3.3 初始实现原则

- 先本地 Playwright，暂不接远程浏览器
- 先 file-based storage，暂不接 DB
- 先完成 MCP 闭环，再做 UI 或复杂运维能力
- 所有“需要人工处理”的流程都建模成显式状态
- 默认只返回结构化摘要，不直接返回整页 HTML

---

# 4. 推荐目录结构

```txt
browser-mcp-server/
  package.json
  tsconfig.json
  README.md
  .gitignore
  .env.example
  config/
    default.json
  data/
    .gitkeep
    sessions/
    auth-contexts/
    logs/
    snapshots/
    exports/
  src/
    index.ts
    server/
      createServer.ts
      registerTools.ts
      registerResources.ts
      error.ts
    config/
      config.ts
      schema.ts
    logging/
      logger.ts
    types/
      common.ts
      session.ts
      auth.ts
      snapshot.ts
      extraction.ts
      tool.ts
      error.ts
    browser/
      adapter.ts
      playwrightAdapter.ts
      sessionManager.ts
      browserFactory.ts
      pageActions.ts
      pageSnapshot.ts
      authDetector.ts
      extraction/
        extractText.ts
        extractTable.ts
        extractForm.ts
        interactiveElements.ts
    human/
      humanCoordinator.ts
      humanState.ts
    auth/
      authContextService.ts
      authContextStore.ts
    storage/
      storage.ts
      fileStorage.ts
      jsonStore.ts
    security/
      redact.ts
      domainGuard.ts
      policy.ts
    tools/
      session/
        createSession.ts
        getSession.ts
        listSessions.ts
        closeSession.ts
      human/
        pauseForHuman.ts
        resumeSession.ts
        getHumanWaitState.ts
      auth/
        saveAuthContext.ts
        loadAuthContext.ts
        listAuthContexts.ts
        deleteAuthContext.ts
      page/
        navigate.ts
        click.ts
        fill.ts
        selectOption.ts
        wait.ts
        scroll.ts
        screenshot.ts
      extract/
        snapshot.ts
        extractText.ts
        extractTable.ts
        extractForm.ts
        getInteractiveElements.ts
      devassist/
        generatePlaywrightScript.ts
        generatePageObject.ts
        generateDataSchema.ts
        exportExtractionResult.ts
    resources/
      sessionsResource.ts
      authContextsResource.ts
      latestSnapshotResource.ts
      latestExtractionResource.ts
      latestLogsResource.ts
    utils/
      ids.ts
      time.ts
      files.ts
      json.ts
  tests/
    unit/
    integration/
```

---

# 5. 模块职责说明

## 5.1 `src/index.ts`

职责：

- 读取配置
- 初始化日志
- 初始化存储
- 初始化服务依赖
- 创建并启动 MCP Server

要求：

- 启动失败必须打印结构化错误
- 允许通过环境变量指定配置路径

---

## 5.2 `src/server/createServer.ts`

职责：

- 创建 MCP Server 实例
- 注入依赖容器
- 调用 tool/resource 注册函数

要求：

- 不包含具体业务逻辑
- 仅负责 server composition

---

## 5.3 `src/server/registerTools.ts`

职责：

- 注册全部 MCP tools
- 为每个 tool 绑定 handler、input schema、output schema

要求：

- 按模块分类注册
- 每个 tool 名称保持稳定
- 每个 tool 的 schema 使用 Zod 定义

---

## 5.4 `src/server/registerResources.ts`

职责：

- 注册可供 LLM 读取的 MCP resources

要求：

- resource 输出必须结构化
- 禁止直接返回过大对象

---

## 5.5 `src/browser/adapter.ts`

职责：

- 定义浏览器适配层接口

必须定义的能力：

- createSession
- closeSession
- getSession
- navigate
- click
- fill
- selectOption
- waitFor
- scroll
- screenshot
- snapshot
- extractText
- extractTable
- extractForm
- getInteractiveElements
- saveStorageState
- loadStorageState

说明：

- 所有 tool 不得直接操作 Playwright，必须通过 adapter
- 方便未来替换为远程 provider

---

## 5.6 `src/browser/playwrightAdapter.ts`

职责：

- 使用 Playwright 实现 adapter 接口

要求：

- 每个 session 绑定独立 browser context
- 支持 headless / headed
- 支持 storageState 载入与保存
- 所有操作必须附带统一错误转换

---

## 5.7 `src/browser/sessionManager.ts`

职责：

- 管理内存中的 session registry
- 管理 session 生命周期
- 提供 session 查询、状态变更、销毁逻辑

要求：

- session 生命周期必须明确
- 状态切换必须受控
- 不允许任意字符串直接改 session 状态

---

## 5.8 `src/human/humanCoordinator.ts`

职责：

- 管理人工接管状态
- 将 session 切换到 `waiting_for_human`
- 保存暂停原因、操作建议、时间戳
- 恢复 session

要求：

- 必须能查询当前是否处于人工等待态
- 恢复时必须校验 session 仍有效
- 支持用户主动暂停

---

## 5.9 `src/auth/authContextService.ts`

职责：

- 保存和加载 auth context
- 管理 auth context 元数据
- 验证登录态是否有效

要求：

- 默认存 Playwright `storageState`
- 允许绑定 `domain` 和 `environment`
- 删除 auth context 时同时删除底层文件

---

## 5.10 `src/browser/authDetector.ts`

职责：

- 基于页面特征检测：
  - 是否进入登录页
  - 是否进入 MFA 页
  - 是否需要人工处理
  - 是否处于已登录状态

要求：

- 初版可用启发式规则
- 后续允许配置化规则

建议检测信号：

- URL 包含 login / signin / auth / verify
- 页面存在 password 输入框
- 页面存在 OTP / MFA 输入框
- 页面存在扫码提示
- 页面存在明显未登录文案

---

## 5.11 `src/browser/pageSnapshot.ts`

职责：

- 将当前页面整理为适合 LLM 消费的结构化快照

快照建议字段：

- title
- url
- visibleTextSummary
- keySections
- interactiveElementsSummary
- tablesSummary
- formsSummary
- generatedAt

要求：

- 支持 detail level：`minimal | normal | rich`
- 不直接输出完整 HTML

---

## 5.12 `src/browser/extraction/*`

### `extractText.ts`

职责：

- 提取页面可见文本或特定 selector 文本

### `extractTable.ts`

职责：

- 提取表格或表格式布局数据

### `extractForm.ts`

职责：

- 提取表单 schema

### `interactiveElements.ts`

职责：

- 输出关键交互元素摘要

要求：

- 每个抽取器都独立实现
- 统一输出结构体
- 对空结果必须返回明确状态，不得 silent fail

---

## 5.13 `src/security/*`

### `redact.ts`

职责：

- 对日志、导出结果、页面文本进行脱敏

### `domainGuard.ts`

职责：

- 校验目标 URL 是否允许访问

### `policy.ts`

职责：

- 控制最大页数、最大导出量、是否允许持久化登录态等

---

# 6. 核心数据类型定义

以下为建议类型，Cursor 实现时可直接据此生成 TypeScript interface / zod schema。

---

## 6.1 Session

```ts
export type SessionStatus =
  | 'created'
  | 'running'
  | 'waiting_for_human'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'closed';

export interface BrowserSessionMeta {
  sessionId: string;
  status: SessionStatus;
  browserType: 'chromium';
  headless: boolean;
  currentUrl?: string;
  createdAt: string;
  updatedAt: string;
  authContextId?: string;
  pendingHumanAction?: PendingHumanAction | null;
  lastSnapshotRef?: string | null;
  lastError?: ToolError | null;
}
```

---

## 6.2 PendingHumanAction

```ts
export interface PendingHumanAction {
  reason:
    | 'LOGIN_REQUIRED'
    | 'MFA_REQUIRED'
    | 'CAPTCHA_REQUIRED'
    | 'SCAN_REQUIRED'
    | 'MANUAL_CONFIRMATION_REQUIRED'
    | 'USER_REQUESTED_PAUSE';
  instructions: string;
  createdAt: string;
  url?: string;
  screenshotRef?: string;
}
```

---

## 6.3 AuthContext

```ts
export interface AuthContextMeta {
  authContextId: string;
  name: string;
  domain: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
  storageStatePath: string;
  isValid: boolean;
  lastVerifiedAt?: string;
}
```

---

## 6.4 PageSnapshot

```ts
export interface PageSnapshot {
  snapshotId: string;
  sessionId: string;
  title: string;
  url: string;
  detailLevel: 'minimal' | 'normal' | 'rich';
  visibleTextSummary: string;
  keySections: Array<{
    heading?: string;
    textSummary: string;
  }>;
  interactiveElementsSummary: InteractiveElementSummary[];
  tablesSummary: TableSummary[];
  formsSummary: FormSummary[];
  generatedAt: string;
}
```

---

## 6.5 InteractiveElementSummary

```ts
export interface InteractiveElementSummary {
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'tab' | 'dialog' | 'pagination';
  text?: string;
  label?: string;
  selectorHint?: string;
  disabled?: boolean;
}
```

---

## 6.6 TableExtractionResult

```ts
export interface TableExtractionResult {
  extractionId: string;
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
  paginationInfo?: {
    page?: number;
    pageSize?: number;
    hasNextPage?: boolean;
  };
}
```

---

## 6.7 FormExtractionResult

```ts
export interface FormFieldSchema {
  type: 'text' | 'textarea' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'date' | 'unknown';
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  defaultValue?: string | boolean | number | null;
}

export interface FormExtractionResult {
  extractionId: string;
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  fields: FormFieldSchema[];
}
```

---

## 6.8 ToolError

```ts
export interface ToolError {
  errorCode:
    | 'INVALID_INPUT'
    | 'SESSION_NOT_FOUND'
    | 'BROWSER_START_FAILED'
    | 'NAVIGATION_FAILED'
    | 'ELEMENT_NOT_FOUND'
    | 'ELEMENT_NOT_INTERACTABLE'
    | 'TIMEOUT'
    | 'AUTH_CONTEXT_INVALID'
    | 'HUMAN_ACTION_REQUIRED'
    | 'PERMISSION_DENIED'
    | 'DOMAIN_NOT_ALLOWED'
    | 'EXPORT_FAILED'
    | 'STORAGE_FAILED'
    | 'UNKNOWN_ERROR';
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}
```

---

# 7. MCP Tools 清单

以下 tools 必须实现为第一版稳定接口。

---

## 7.1 Session Tools

### `browser.create_session`

输入：

```ts
{
  browserType?: 'chromium';
  headless?: boolean;
  authContextId?: string;
  startUrl?: string;
}
```

输出：

```ts
{
  sessionId: string;
  status: SessionStatus;
  currentUrl?: string;
}
```

实现要求：

- 创建 browser + context + page
- 如传入 authContextId，先加载 storageState
- 如传入 startUrl，自动打开页面

---

### `browser.get_session`

输入：

```ts
{ sessionId: string }
```

输出：

```ts
BrowserSessionMeta
```

---

### `browser.list_sessions`

输出：

```ts
{ sessions: BrowserSessionMeta[] }
```

---

### `browser.close_session`

输入：

```ts
{ sessionId: string }
```

输出：

```ts
{ success: true }
```

---

## 7.2 Human-in-the-loop Tools

### `browser.pause_for_human`

输入：

```ts
{
  sessionId: string;
  reason: PendingHumanAction['reason'];
  instructions: string;
}
```

输出：

```ts
{
  sessionId: string;
  status: 'waiting_for_human';
  pendingHumanAction: PendingHumanAction;
}
```

---

### `browser.resume_session`

输入：

```ts
{ sessionId: string }
```

输出：

```ts
{
  sessionId: string;
  status: SessionStatus;
  currentUrl?: string;
  authState: 'logged_in' | 'login_required' | 'unknown';
}
```

实现要求：

- 调用 authDetector 再判断当前页面状态

---

### `browser.get_human_wait_state`

输入：

```ts
{ sessionId: string }
```

输出：

```ts
{
  waiting: boolean;
  pendingHumanAction?: PendingHumanAction | null;
}
```

---

## 7.3 Auth Tools

### `browser.save_auth_context`

输入：

```ts
{
  sessionId: string;
  name: string;
  domain: string;
  environment?: string;
}
```

输出：

```ts
AuthContextMeta
```

---

### `browser.load_auth_context`

输入：

```ts
{
  sessionId: string;
  authContextId: string;
}
```

输出：

```ts
{
  sessionId: string;
  authContextId: string;
  success: true;
}
```

---

### `browser.list_auth_contexts`

输出：

```ts
{ authContexts: AuthContextMeta[] }
```

---

### `browser.delete_auth_context`

输入：

```ts
{ authContextId: string }
```

输出：

```ts
{ success: true }
```

---

## 7.4 Page Action Tools

### `browser.navigate`

输入：

```ts
{
  sessionId: string;
  url: string;
  timeoutMs?: number;
}
```

输出：

```ts
{
  sessionId: string;
  currentUrl: string;
  title?: string;
}
```

---

### `browser.click`

输入：

```ts
{
  sessionId: string;
  selector: string;
  timeoutMs?: number;
}
```

---

### `browser.fill`

输入：

```ts
{
  sessionId: string;
  selector: string;
  value: string;
  timeoutMs?: number;
}
```

要求：

- `value` 不记录到普通日志

---

### `browser.select_option`

### `browser.wait`

### `browser.scroll`

### `browser.take_screenshot`

这些都按同样模式实现：

- 有 sessionId
- 有结构化输入
- 有统一错误返回

---

## 7.5 Extraction Tools

### `browser.snapshot`

输入：

```ts
{
  sessionId: string;
  detailLevel?: 'minimal' | 'normal' | 'rich';
}
```

输出：

```ts
PageSnapshot
```

---

### `browser.extract_text`

输入：

```ts
{
  sessionId: string;
  selector?: string;
  mode?: 'page' | 'selector';
}
```

输出：

```ts
{
  sessionId: string;
  sourceUrl: string;
  extractedAt: string;
  textBlocks: string[];
}
```

---

### `browser.extract_table`

输入：

```ts
{
  sessionId: string;
  selector?: string;
  outputFormat?: 'json' | 'csv';
  pageLimit?: number;
}
```

输出：

```ts
TableExtractionResult
```

---

### `browser.extract_form`

输入：

```ts
{
  sessionId: string;
  selector?: string;
}
```

输出：

```ts
FormExtractionResult
```

---

### `browser.get_interactive_elements`

输出：

```ts
{
  sessionId: string;
  sourceUrl: string;
  elements: InteractiveElementSummary[];
}
```

---

## 7.6 Dev Assist Tools

### `browser.generate_playwright_script`

输入：

```ts
{
  sessionId: string;
  target?: 'login_flow' | 'current_page' | 'extraction_flow';
}
```

输出：

```ts
{
  language: 'typescript';
  code: string;
  notes: string[];
}
```

实现要求：

- 基于最近操作日志 + 当前页面元素摘要生成
- 第一版可模板化，不要求 AI 生成

---

### `browser.generate_page_object`

输出：

```ts
{
  language: 'typescript';
  code: string;
}
```

---

### `browser.generate_data_schema`

输入：

```ts
{
  source: 'latest_table' | 'latest_form';
  format: 'typescript' | 'zod' | 'json-schema';
}
```

输出：

```ts
{
  format: 'typescript' | 'zod' | 'json-schema';
  code: string;
}
```

---

### `browser.export_extraction_result`

输入：

```ts
{
  source: 'latest_table' | 'latest_form' | 'latest_text';
  format: 'json' | 'csv' | 'md';
}
```

输出：

```ts
{
  exportPath: string;
}
```

---

# 8. MCP Resources 清单

必须实现以下 resources：

---

## `browser://sessions`

输出：

- 当前全部 session 的精简信息

## `browser://auth-contexts`

输出：

- 当前 auth context 列表

## `browser://latest-snapshot/{sessionId}`

输出：

- 最近一次 PageSnapshot

## `browser://latest-extraction/{sessionId}`

输出：

- 最近一次抽取结果摘要

## `browser://latest-logs/{sessionId}`

输出：

- 最近 N 条工具调用日志和页面动作日志

资源输出要求：

- 精简、结构化
- 不直接返回大型原始对象
- 对敏感字段自动脱敏

---

# 9. 状态机要求

## 9.1 Session 状态转移

```txt
created -> running
running -> waiting_for_human
running -> completed
running -> failed
waiting_for_human -> running
waiting_for_human -> failed
running -> closed
failed -> closed
completed -> closed
```

要求：

- 只能通过受控方法转移
- 状态切换必须记录日志
- 非法状态切换直接报错

---

## 9.2 Human 状态机

必须支持以下事件：

- `pause_requested`
- `auth_required_detected`
- `human_completed`
- `resume_requested`
- `session_invalid`
- `timeout_expired`

建议实现为单独的纯逻辑模块，便于单元测试。

---

# 10. 存储设计

## 10.1 File Storage 方案

建议本地目录结构：

```txt
data/
  sessions/
    {sessionId}.json
  auth-contexts/
    {authContextId}.json
    {authContextId}.storage-state.json
  snapshots/
    {snapshotId}.json
  exports/
    {exportId}.json
    {exportId}.csv
    {exportId}.md
  logs/
    app.log
```

## 10.2 抽象接口

必须抽象出：

```ts
interface StorageProvider {
  readJson<T>(path: string): Promise<T | null>;
  writeJson<T>(path: string, value: T): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, value: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}
```

要求：

- 业务代码不得直接依赖 `fs`
- 方便后续切换数据库或对象存储

---

# 11. 配置系统要求

## 11.1 推荐配置文件

`config/default.json`

示例：

```json
{
  "browser": {
    "defaultType": "chromium",
    "headless": false,
    "launchTimeoutMs": 8000,
    "actionTimeoutMs": 10000
  },
  "security": {
    "allowDomains": ["example.com", "app.example.com"],
    "denyDomains": [],
    "allowPersistAuthContext": true,
    "maxExportRows": 1000,
    "maxPaginationPages": 10
  },
  "storage": {
    "baseDir": "./data"
  },
  "logging": {
    "level": "info"
  },
  "snapshot": {
    "defaultDetailLevel": "normal"
  }
}
```

## 11.2 配置模块要求

- 使用 Zod 做配置校验
- 启动时校验配置
- 错误配置应直接阻止启动

---

# 12. 日志要求

## 12.1 结构化日志

建议字段：

- timestamp
- level
- module
- event
- sessionId
- authContextId
- toolName
- url
- message
- errorCode

## 12.2 必须记录的事件

- server_started
- session_created
- session_closed
- navigation_started
- navigation_finished
- human_pause_requested
- human_resumed
- auth_context_saved
- auth_context_loaded
- snapshot_generated
- extraction_completed
- tool_failed

## 12.3 脱敏要求

- `fill` 输入值默认不打印
- cookie、token、手机号、邮箱等字段必须可脱敏

---

# 13. 错误处理要求

## 13.1 统一错误构造器

实现 `createToolError()`，输出统一结构：

```ts
{
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}
```

## 13.2 错误映射

- Playwright timeout -> `TIMEOUT`
- selector not found -> `ELEMENT_NOT_FOUND`
- navigation failure -> `NAVIGATION_FAILED`
- missing session -> `SESSION_NOT_FOUND`
- blocked domain -> `DOMAIN_NOT_ALLOWED`
- manual action needed -> `HUMAN_ACTION_REQUIRED`

## 13.3 每个 tool handler 要求

- 所有异常必须统一转换
- 不允许直接抛出原始 Playwright 错误到 MCP 客户端

---

# 14. 安全要求

## 14.1 不存储明文账号密码

明确要求：

- tool 参数中不接收 username/password 作为长期能力设计
- 允许用户通过浏览器手工输入
- `fill` 工具可存在，但日志层必须掩码

## 14.2 域名白名单

所有 `navigate` 前必须校验：

- 是否属于 allowDomains
- 是否命中 denyDomains
- 未命中规则时默认拒绝，或通过配置决定是否允许

## 14.3 导出限制

必须支持：

- 最大导出行数
- 最大分页数
- 可按域名禁用导出

## 14.4 敏感数据脱敏

初版至少支持：

- 邮箱
- 手机号
- token
- cookie
- bearer header
- 长数字串

---

# 15. 首版实现顺序

Cursor 执行时按下面顺序落地。

## 阶段 1：项目骨架

实现内容：

- package.json
- tsconfig.json
- 基础目录结构
- config 模块
- logger 模块
- 基础 types
- StorageProvider + fileStorage
- MCP server 创建与空 tools 注册

完成标准：

- `npm run dev` 可启动服务
- 服务可成功注册空工具

---

## 阶段 2：Session 与 Browser Adapter

实现内容：

- adapter.ts
- playwrightAdapter.ts
- sessionManager.ts
- browser.create_session
- browser.get_session
- browser.list_sessions
- browser.close_session

完成标准：

- 可创建浏览器
- 可打开页面
- 可关闭页面

---

## 阶段 3：Human-in-the-loop

实现内容：

- humanState.ts
- humanCoordinator.ts
- authDetector.ts
- browser.pause_for_human
- browser.resume_session
- browser.get_human_wait_state

完成标准：

- 可显式暂停
- 可恢复
- 能返回需要人工处理状态

---

## 阶段 4：Auth Context

实现内容：

- authContextStore.ts
- authContextService.ts
- browser.save_auth_context
- browser.load_auth_context
- browser.list_auth_contexts
- browser.delete_auth_context

完成标准：

- 可保存 storage state
- 可加载已有登录态

---

## 阶段 5：页面抽取

实现内容：

- pageSnapshot.ts
- extractText.ts
- extractTable.ts
- extractForm.ts
- interactiveElements.ts
- browser.snapshot
- browser.extract_text
- browser.extract_table
- browser.extract_form
- browser.get_interactive_elements

完成标准：

- 能返回结构化页面摘要
- 能抓表格和表单

---

## 阶段 6：安全与导出

实现内容：

- domainGuard.ts
- redact.ts
- policy.ts
- browser.export_extraction_result

完成标准：

- 域名限制生效
- 导出受限生效
- 敏感数据脱敏可用

---

## 阶段 7：开发辅助

实现内容：

- generatePlaywrightScript.ts
- generatePageObject.ts
- generateDataSchema.ts

完成标准：

- 可根据当前页面和最近抽取结果生成代码文本

---

# 16. 对 Cursor 的具体生成要求

下面这段可以直接作为 Cursor 的执行约束：

## 16.1 代码风格

- 全部使用 TypeScript
- 所有核心对象定义 interface/type
- 所有 tool 输入输出使用 Zod schema
- 所有模块默认导出禁止，优先命名导出
- 所有异步方法使用 async/await
- 所有错误使用统一错误工厂处理

## 16.2 实现约束

- 不要跳过类型定义直接写业务逻辑
- 不要把 Playwright 代码散落在 tool handler 中
- 不要把存储逻辑散落在业务层中
- 不要让 tool 直接访问 `fs`
- 不要让日志打印敏感输入值

## 16.3 代码生成顺序

Cursor 应按以下顺序生成代码：

1. `types/*`
2. `config/*`
3. `logging/*`
4. `storage/*`
5. `browser/adapter.ts`
6. `browser/playwrightAdapter.ts`
7. `browser/sessionManager.ts`
8. `human/*`
9. `auth/*`
10. `tools/session/*`
11. `tools/human/*`
12. `tools/auth/*`
13. `browser/extraction/*`
14. `tools/extract/*`
15. `security/*`
16. `tools/devassist/*`
17. `server/registerTools.ts`
18. `server/registerResources.ts`
19. `index.ts`

## 16.4 每次生成后必须满足

- TypeScript 无编译错误
- imports 正确
- 不保留未使用变量
- 可通过最小 smoke test

---

# 17. 最小测试要求

## 17.1 单元测试

至少覆盖：

- session 状态迁移
- humanCoordinator 暂停/恢复
- authContextService 保存/读取
- domainGuard 规则匹配
- redact 脱敏规则
- tool schema 校验

## 17.2 集成测试

至少覆盖：

- create_session -> navigate -> close_session
- pause_for_human -> resume_session
- save_auth_context -> load_auth_context
- snapshot
- extract_text

---

# 18. MVP 完成定义

当以下条件满足时，视为 MVP 完成：

1. MCP Server 能被 Cursor 正常连接
2. 能创建浏览器会话并访问允许域名
3. 能人工登录并恢复流程
4. 能保存与复用登录态
5. 能返回页面结构化快照
6. 能抽取文本、表格或表单中的至少一种
7. 能输出统一日志与统一错误结构

---

# 19. 直接给 Cursor 的最终实现指令

可将下面这段直接贴给 Cursor：

```md
请按本文档实现一个 TypeScript Browser MCP Server。
要求：
1. 先完成项目骨架和基础类型
2. 再完成 Playwright adapter 和 session 管理
3. 再完成 human-in-the-loop 状态机
4. 再完成 auth context 保存/加载
5. 再完成 snapshot、extract_text、extract_table、extract_form
6. 再完成 security 和 devassist 工具
7. 所有 tool 都必须有 zod schema、统一错误返回、结构化日志
8. 不要一次性生成全部代码，按模块逐步生成并保证每一步可编译
9. 优先保证可运行和类型正确，不要先做复杂优化
10. 默认只支持 chromium，本地 file storage，headed 模式
```

---

# 20. 补充说明

如果后续继续扩展，可以在不破坏当前抽象的前提下增加：

- 远程浏览器 provider
- 多用户 auth context 隔离
- SQLite / Postgres 存储
- 更强的页面结构语义抽取
- 面向特定站点的 auth 规则插件
- 更高级的开发辅助代码生成

当前阶段不要优先实现以上扩展。