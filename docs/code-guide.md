# Playwright Browser MCP Server — 代码指南

本文档按目录与文件说明各部分代码的职责与行为，便于阅读与维护。

---

## 1. 根入口

### `src/index.ts`

- **职责**：进程入口；加载配置、初始化依赖、启动 MCP Server。
- **流程**：
  1. 通过 `CONFIG_PATH` 或默认路径调用 `loadConfig`，失败则打印 JSON 错误并 `process.exit(1)`。
  2. 用配置创建 `createLogger(config.logging)`，记录 `server_started`。
  3. 实例化 `FileStorage({ baseDir })`、`PlaywrightAdapter`、`SessionManager(adapter, logger)`、`HumanCoordinator(sessionManager)`、`AuthContextService(storage, baseDir)`、`createLatestExtractionsStore()`。
  4. 调用 `runServer(deps)`；若抛错则用 getLogger 记录 `server_start_failed` 并退出。
- **不包含**：具体 MCP tool/resource 实现，仅组合与启动。

---

## 2. 配置 (config)

### `src/config/schema.ts`

- **职责**：用 Zod 定义配置结构并导出类型。
- **内容**：`browser`（type、headless、actionTimeoutMs、launchTimeoutMs）、`security`（allowDomains、denyDomains、maxExportRows、maxPaginationPages）、`storage`（baseDir）、`logging`（level、pretty）、`snapshot`（defaultDetailLevel）等 schema；`AppConfig` 为根类型。

### `src/config/config.ts`

- **职责**：从 JSON 文件读取配置并校验。
- **行为**：`loadConfig(configPath?)` 读取 `configPath ?? 'config/default.json'`，解析后经 schema 校验，返回 `AppConfig`；校验失败抛错。

---

## 3. 日志 (logging)

### `src/logging/logger.ts`

- **职责**：基于 pino 的结构化日志；提供 `createLogger`、`getLogger`、`logEvent`。
- **行为**：`createLogger(opts)` 创建并注册默认 logger；`getLogger()` 返回当前 logger；`logEvent(logger, level, event, data)` 写入带 `event` 字段的日志行，供后续检索。

---

## 4. 类型 (types)

### `src/types/common.ts`

- **职责**：通用枚举与字面量类型。
- **内容**：`SessionStatus`（created / running / waiting_for_human / paused / completed / failed / closed）、`BrowserType`（chromium）、`DetailLevel`（minimal / normal / rich）。

### `src/types/session.ts`

- **职责**：会话与“待人工处理”相关类型。
- **内容**：`PendingHumanAction`（reason、instructions、createdAt、url、screenshotRef）；`BrowserSessionMeta`（sessionId、status、browserType、headless、currentUrl、createdAt、updatedAt、authContextId、pendingHumanAction、lastSnapshotRef、lastError）；re-export `SessionStatus`。

### `src/types/auth.ts`

- **职责**：登录态上下文元数据。
- **内容**：`AuthContextMeta`（authContextId、name、domain、environment、createdAt、updatedAt、storageStatePath、isValid、lastVerifiedAt）。

### `src/types/snapshot.ts`

- **职责**：页面快照与摘要结构。
- **内容**：`InteractiveElementSummary`、`KeySection`、`TableSummary`、`FormSummary`、`PageSnapshot`（sessionId、url、title、generatedAt、detailLevel、visibleTextSummary、keySections、tables、forms、interactiveElements）。

### `src/types/extraction.ts`

- **职责**：各类抽取结果类型。
- **内容**：`TableExtractionResult`、`FormFieldSchema`、`FormExtractionResult`、`TextExtractionResult`、`InteractiveElementsResult` 等。

### `src/types/error.ts`

- **职责**：MCP 工具层统一错误形态。
- **内容**：`ToolErrorCode` 枚举、`ToolError` 接口、`createToolError(code, message, details?)` 工厂。

### `src/types/tool.ts`

- **职责**：集中 re-export 上述类型，供 tools 等模块引用。

---

## 5. Server 组合与注册 (server)

### `src/server/createServer.ts`

- **职责**：创建 MCP Server、注册 tools/resources、提供 runServer。
- **行为**：`createServer(deps)` 实例化 `McpServer`（name/version），调用 `registerTools(server, deps)`、`registerResources(server, deps)`，返回 server；`runServer(deps)` 创建 server 后使用 `StdioServerTransport` 连接，与客户端通过 stdio 通信。

### `src/server/registerTools.ts`

- **职责**：注册所有 MCP tools，绑定 schema 与 handler。
- **行为**：从 deps 取出 sessionManager、humanCoordinator、authContextService、storage、logger、config、latestExtractions 等；对每个 tool 调用 `server.registerTool(name, { title, description, inputSchema, outputSchema }, handler)`。Handler 内：Zod 解析入参 → 调用对应 tools/* 下的函数 → 记录日志（logEvent、appendSessionLog）→ 返回 `{ content, structuredContent }`；错误统一用 `createToolError` 序列化后 throw。
- **工具列表**：create_session、get_session、list_sessions、close_session、navigate、pause_for_human、resume_session、get_human_wait_state、save_auth_context、load_auth_context、list_auth_contexts、delete_auth_context、click、fill、select_option、wait、scroll、screenshot、snapshot、extract_text、extract_table、extract_form、get_interactive_elements、generate_playwright_script、generate_page_object、generate_data_schema、export_extraction_result。

### `src/server/registerResources.ts`

- **职责**：注册 MCP resources，供客户端按 URI 读取数据。
- **行为**：为每个 resource 调用 `server.resource(...)`，绑定 URI 与 read 回调。回调内调用对应 `resources/*.ts` 的 get 函数，返回 JSON 文本；必要时对内容做 redact。
- **资源列表**：browser://sessions、browser://auth-contexts、browser://latest-snapshot/{sessionId}、browser://latest-extraction/{sessionId}、browser://latest-logs。

### `src/server/error.ts`

- **职责**：统一错误创建与类型导出。
- **内容**：re-export `ToolErrorCode`、`createToolError` 等，供 registerTools、Adapter、HumanCoordinator、Auth 等使用。

---

## 6. 浏览器与会话 (browser)

### `src/browser/adapter.ts`

- **职责**：定义浏览器能力接口，与具体实现解耦。
- **接口**：`BrowserAdapter` 包含 createSession、getSession、closeSession、navigate、click、fill、selectOption、waitFor、scroll、screenshot、snapshot、extractText、extractTable、extractForm、getInteractiveElements、saveStorageState、loadStorageState；`BrowserSessionHandle` 为不透明句柄，供 SessionManager 与 Auth 等使用。

### `src/browser/playwrightAdapter.ts`

- **职责**：用 Playwright 实现 BrowserAdapter。
- **行为**：每会话一个 BrowserContext + Page；createSession 支持 headless、storageStatePath、startUrl；navigate/click/fill 等转发到 page；snapshot 与各种 extract 在 page 内 `evaluate` 脚本，组装成类型化结果；所有异常经 `mapPlaywrightError` 转为 ToolError 形态并 `throw new Error(JSON.stringify(createToolError(...)))`。

### `src/browser/sessionManager.ts`

- **职责**：内存中的会话注册表与会话生命周期。
- **行为**：`createSession(options)` 生成 sessionId、调用 adapter.createSession、维护 `SessionEntry { meta, handle }`、状态设为 created 再根据是否 navigate 设为 running；`getSession(sessionId)`、`listSessions()`、`getSessionMeta`、`setStatus`、`updateMeta`、`closeSession`；状态迁移遵守 `VALID_TRANSITIONS`，非法转移抛错；若注入 logger 则状态变更时打 `session_status_changed`。

### `src/browser/browserFactory.ts`

- **职责**：创建 BrowserAdapter 实例的工厂。
- **行为**：`createBrowserAdapter(config)` 返回 new PlaywrightAdapter(...)，便于将来替换为其他实现。

### `src/browser/authDetector.ts`

- **职责**：根据当前页面信息推断登录状态（启发式）。
- **行为**：`detectAuthState({ url, visibleTextSummary, title })` 返回 `logged_in` | `login_required` | `mfa_required` | `unknown`，供 HumanCoordinator.resumeSession 等使用。

### `src/browser/pageSnapshot.ts`

- **职责**：快照展示或格式化辅助（若需）；实际快照数据在 PlaywrightAdapter 的 snapshot 中通过 evaluate 收集。

### `src/browser/pageActions.ts`

- **职责**：页面操作的共享逻辑占位，当前可为空或简单委托到 adapter。

### `src/browser/extraction/extractText.ts`

- **职责**：在页面上下文中抽取“可见文本”的逻辑或结果构建；被 Adapter 或 tools 层调用。

### `src/browser/extraction/extractTable.ts`

- **职责**：构建表格抽取结果与空结果判断。
- **内容**：`buildTableExtractionResult`、`isEmptyTableResult`；列/行结构来自 Adapter 内 evaluate。

### `src/browser/extraction/extractForm.ts`

- **职责**：构建表单 schema/字段列表等抽取结果；与 Adapter 内表单收集逻辑配合。

### `src/browser/extraction/interactiveElements.ts`

- **职责**：可点击/可输入等交互元素的摘要结构；与 Adapter 内收集逻辑配合。

---

## 7. 人机协同 (human)

### `src/human/humanState.ts`

- **职责**：人机状态的纯逻辑与事件定义。
- **内容**：`HumanEvent`、`HumanState`（idle / waiting_for_human）、`getNextHumanState`、`createPendingAction(reason, instructions, options)` 生成 `PendingHumanAction`。

### `src/human/humanCoordinator.ts`

- **职责**：对外提供“暂停”“恢复”“查询等待状态”的接口。
- **行为**：`pauseForHuman(sessionId, reason, instructions, options)` 取会话、生成 PendingHumanAction、setStatus(waiting_for_human)、updateMeta(pendingHumanAction)；`getHumanWaitState(sessionId)` 返回 waiting 与 pendingHumanAction；`resumeSession(sessionId)` 校验状态为 waiting_for_human 后 setStatus(running)、清空 pendingHumanAction、可选调用 adapter.snapshot + detectAuthState 返回 authState。

---

## 8. 登录态 (auth)

### `src/auth/authContextStore.ts`

- **职责**：auth context 在存储中的路径约定与元数据/文件读写。
- **行为**：`getStorageStatePath(authContextId)`、`readAuthContextMeta`、`writeAuthContextMeta`、`deleteAuthContextFiles`、`listAuthContextIds`，均基于 StorageProvider 与 baseDir。

### `src/auth/authContextService.ts`

- **职责**：对上层提供“保存/加载/列表/删除”auth context 的能力。
- **行为**：`saveAuthContext(sessionManager, sessionId, { name, domain, environment })` 生成 authContextId、取 session handle、adapter.saveStorageState、写元数据；`getStorageStatePathForSession(authContextId)` 返回绝对路径供 create_session 加载；`loadAuthContext(sessionManager, sessionId, authContextId)` 读元数据、adapter.loadStorageState(handle, path)；`listAuthContexts`、`deleteAuthContext` 委托 store。

---

## 9. 存储 (storage)

### `src/storage/storage.ts`

- **职责**：抽象持久化接口。
- **接口**：`StorageProvider` 提供 readJson、writeJson、readText、writeText、delete、exists、list 等，路径均为相对 baseDir 的 key。

### `src/storage/fileStorage.ts`

- **职责**：基于文件系统的 StorageProvider 实现。
- **行为**：路径拼接为 `baseDir + key`；写前可 ensureDir；list 可枚举目录下键。

### `src/storage/jsonStore.ts`

- **职责**：基于 StorageProvider 的简易 key-value 封装（如 data/store 下的 getStored/setStored），供缓存或简单状态存储。

---

## 10. 安全与策略 (security)

### `src/security/domainGuard.ts`

- **职责**：按配置判断 URL 是否允许访问。
- **行为**：`isDomainAllowed(url, { allowDomains, denyDomains })` 解析 URL 的 host，先 deny 再 allow，返回 boolean；navigate 前必须通过才放行。

### `src/security/redact.ts`

- **职责**：对字符串或对象中敏感字段做脱敏。
- **行为**：`redactText`、`redactObject` 掩码邮箱、手机、token、长数字、密码等；用于日志与 resource 输出。

### `src/security/policy.ts`

- **职责**：导出与分页限制。
- **行为**：`checkExportRows(count, max)`、`checkPaginationPage(page, max)` 超限时抛错或返回明确错误，供 extract/export 等调用。

---

## 11. 工具函数 (utils)

### `src/utils/ids.ts`

- **职责**：生成唯一 ID。
- **内容**：UUID、带前缀的 sessionId/snapId/extractionId 等。

### `src/utils/time.ts`

- **职责**：时间戳。
- **内容**：`nowIso()` 返回当前 ISO 8601 字符串。

### `src/utils/files.ts`

- **职责**：路径与文件扩展名等小工具。
- **内容**：ensureExtension、joinPath、getDir 等。

### `src/utils/json.ts`

- **职责**：JSON 解析/序列化安全封装。
- **内容**：safeParse、stringifyCompact、stringifyPretty 等。

---

## 12. Tools 实现 (tools)

每个 tool 通常包含：Zod 的 inputSchema/outputSchema、一个 async handler 函数。Handler 内解析入参、调用 SessionManager/HumanCoordinator/AuthContextService/Adapter、返回结构化结果；错误用 createToolError 包装后 throw。

### session

- **createSession.ts**：createSessionInputSchema/OutputSchema；createSession(sessionManager, storageStatePath, input)；返回 sessionId、status、currentUrl。
- **getSession.ts**：按 sessionId 取 meta。
- **listSessions.ts**：返回所有会话摘要。
- **closeSession.ts**：关闭指定会话并清理。

### human

- **pauseForHuman.ts**：调用 humanCoordinator.pauseForHuman，写入 reason/instructions。
- **resumeSession.ts**：调用 humanCoordinator.resumeSession，返回 status、currentUrl、authState。
- **getHumanWaitState.ts**：返回 waiting、pendingHumanAction。

### auth

- **saveAuthContext.ts**：authContextService.saveAuthContext，返回 AuthContextMeta。
- **loadAuthContext.ts**：authContextService.loadAuthContext。
- **listAuthContexts.ts**：返回 auth context 列表。
- **deleteAuthContext.ts**：按 authContextId 删除。

### page

- **navigate.ts**：domainGuard 校验后 adapter.navigate；可选记录 navigation_started。
- **click.ts**：adapter.click(handle, selector, options)。
- **fill.ts**：adapter.fill。
- **selectOption.ts**：adapter.selectOption。
- **wait.ts**：adapter.waitFor。
- **scroll.ts**：adapter.scroll。
- **screenshot.ts**：adapter.screenshot，返回 base64 或路径。

### extract

- **snapshot.ts**：adapter.snapshot(detailLevel)；可写入 lastSnapshotRef、latestSnapshot resource 数据源。
- **extractText.ts**：adapter.extractText；可写入 latestExtractions 的 text。
- **extractTable.ts**：adapter.extractTable；可写入 latestExtractions 的 table；可能调用 policy.checkExportRows。
- **extractForm.ts**：adapter.extractForm；可写入 latestExtractions 的 form。
- **getInteractiveElements.ts**：adapter.getInteractiveElements。

### devassist

- **latestExtractions.ts**：定义 LatestExtractionsStore 接口与 createLatestExtractionsStore()，内存缓存最近一次 text/table/form 抽取，供 generateDataSchema、exportExtractionResult 使用。
- **generatePlaywrightScript.ts**：根据当前会话与可选历史生成 Playwright 脚本文本。
- **generatePageObject.ts**：根据快照或交互元素生成 Page Object 风格代码。
- **generateDataSchema.ts**：基于 latestExtractions 中的 table/form 生成数据 schema（如 JSON Schema）。
- **exportExtractionResult.ts**：将最近一次抽取结果写入 data/exports 或通过 storage 持久化，并应用 policy/redact。

---

## 13. Resources 实现 (resources)

每个 resource 提供一个 async get 函数，返回要暴露给 MCP 的 JSON 或文本；registerResources 中绑定到对应 URI。

### `src/resources/sessionsResource.ts`

- **职责**：browser://sessions。
- **行为**：sessionManager.listSessions()，组装为 sessions 数组，redactObject 后返回。

### `src/resources/authContextsResource.ts`

- **职责**：browser://auth-contexts。
- **行为**：authContextService.listAuthContexts()，脱敏后返回列表。

### `src/resources/latestSnapshotResource.ts`

- **职责**：browser://latest-snapshot/{sessionId}。
- **行为**：根据 URI 中的 sessionId 取该会话最近一次快照数据（由 snapshot tool 写入），返回 JSON。

### `src/resources/latestExtractionResource.ts`

- **职责**：browser://latest-extraction/{sessionId}。
- **行为**：从 latestExtractionsStore 取该 sessionId 的最近 text/table/form，脱敏后返回。

### `src/resources/latestLogsResource.ts`

- **职责**：browser://latest-logs；并提供 appendSessionLog 供 registerTools 写入每条 tool 调用日志。
- **行为**：内存中保留最近 N 条会话相关日志；read 时返回列表；可带 url 等字段。

---

## 14. 与需求/架构的对应

- 功能与 API 以 **docs/cursor_browser_mcp_engineering_requirements.md** 为准。
- 设计思路与状态机、安全边界见 **docs/design.md**。
- 分层与模块划分见 **docs/architecture.md**。
- 本代码指南作为“每部分代码做了什么”的索引，便于快速定位与修改。
