# Playwright Browser MCP Server — 架构文档

## 1. 架构总览

### 1.1 分层结构

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP 协议层 (stdio)                            │
├─────────────────────────────────────────────────────────────────┤
│  Server 组合层 (createServer, registerTools, registerResources)   │
├─────────────────────────────────────────────────────────────────┤
│  Tool / Resource 层 (tools/*, resources/*)                       │
├─────────────────────────────────────────────────────────────────┤
│  业务编排层 (SessionManager, HumanCoordinator, AuthContextService)│
├─────────────────────────────────────────────────────────────────┤
│  浏览器抽象层 (BrowserAdapter ← PlaywrightAdapter)               │
├─────────────────────────────────────────────────────────────────┤
│  存储抽象层 (StorageProvider ← FileStorage)                      │
├─────────────────────────────────────────────────────────────────┤
│  基础设施 (Config, Logger, Types, Utils, Security)             │
└─────────────────────────────────────────────────────────────────┘
```

- **MCP 协议层**：与 Cursor 等客户端通过 stdio 通信，使用官方/兼容 MCP TypeScript SDK。
- **Server 组合层**：创建 McpServer、注册 Tools/Resources、注入依赖（deps），无业务逻辑。
- **Tool/Resource 层**：每个 MCP tool 或 resource 对应一个或多个 handler，只做参数校验、调用下层、格式化返回与错误。
- **业务编排层**：管理会话生命周期、人机协同状态、登录态元数据；不直接操作 Playwright 或文件。
- **浏览器抽象层**：Adapter 定义接口，PlaywrightAdapter 实现；所有浏览器操作经 Adapter，便于日后换远程 Provider。
- **存储抽象层**：StorageProvider 定义接口，FileStorage 实现；业务不直接依赖 `fs`。
- **基础设施**：配置加载与校验、结构化日志、公共类型、工具函数、安全（域名、脱敏、策略）。

### 1.2 依赖方向

- 上层依赖下层；下层不依赖上层。
- Tool/Resource 依赖 SessionManager、HumanCoordinator、AuthContextService、Adapter、Storage、Logger、Config。
- SessionManager 依赖 Adapter 和 Logger；HumanCoordinator 依赖 SessionManager 与 authDetector 能力；AuthContextService 依赖 Storage 与 SessionManager（用于取 handle 存/载 storageState）。
- Adapter 与 Storage 不依赖具体业务模块，仅依赖类型与工具。

### 1.3 技术选型

| 领域 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js 20+ | 满足 ESM、Promise、现代 API。 |
| 语言 | TypeScript | 严格类型、Zod 校验、可维护性。 |
| 浏览器自动化 | Playwright | 单 Context/Page  per 会话、storageState、稳定 API。 |
| MCP | @modelcontextprotocol/sdk | 官方/兼容 SDK，stdio 传输。 |
| 校验 | Zod | Tool 入参、配置、运行时校验。 |
| 日志 | pino | 结构化、可配置 level、可选 pretty。 |
| 存储 | 文件系统 + StorageProvider | 当前 FileStorage；接口可换 DB/对象存储。 |

---

## 2. 模块划分

### 2.1 入口与配置

| 模块 | 职责 |
|------|------|
| `src/index.ts` | 读取配置、初始化 logger/storage/adapter/sessionManager/humanCoordinator/authContextService/latestExtractions、创建并启动 MCP Server；启动失败时打印结构化错误并退出。 |
| `src/config/config.ts` | 从文件加载配置（支持 CONFIG_PATH）；调用 schema 校验。 |
| `src/config/schema.ts` | Zod 配置 schema（browser、security、storage、logging、snapshot）；导出类型。 |

### 2.2 Server 组合

| 模块 | 职责 |
|------|------|
| `src/server/createServer.ts` | 创建 McpServer 实例；调用 registerTools、registerResources 注入 deps；runServer 使用 StdioServerTransport 连接。 |
| `src/server/registerTools.ts` | 注册所有 MCP tools（session / human / auth / page / extract / devassist），绑定 Zod inputSchema 与 handler；统一错误与日志。 |
| `src/server/registerResources.ts` | 注册 MCP resources（sessions、auth-contexts、latest-snapshot、latest-extraction、latest-logs）；输出结构化、可脱敏。 |
| `src/server/error.ts` | 统一 createToolError 及 ToolError 类型导出。 |

### 2.3 浏览器与会话

| 模块 | 职责 |
|------|------|
| `src/browser/adapter.ts` | 定义 BrowserAdapter 接口（createSession、getSession、closeSession、navigate、click、fill、selectOption、waitFor、scroll、screenshot、snapshot、extractText/Table/Form、getInteractiveElements、save/loadStorageState）。 |
| `src/browser/playwrightAdapter.ts` | 使用 Playwright 实现 Adapter；每会话独立 context；支持 headless/headed、storageState；将底层异常映射为 ToolError 形态。 |
| `src/browser/sessionManager.ts` | 内存会话注册表；会话生命周期与状态迁移（仅受控方法）；提供 getSession、listSessions、setStatus、updateMeta、closeSession；可选 logger 记录状态变更。 |
| `src/browser/browserFactory.ts` | 创建 BrowserAdapter 实例的工厂，便于日后切换实现。 |
| `src/browser/authDetector.ts` | 基于 URL/页面文本等启发式规则，判断当前为登录页、MFA 页、已登录等。 |
| `src/browser/pageSnapshot.ts` | 快照摘要格式化等辅助；实际快照构建在 Adapter/Playwright 侧。 |
| `src/browser/extraction/*` | 抽取结果构建与空结果判断（extractText、extractTable、extractForm、interactiveElements），供 Adapter 或上层复用。 |

### 2.4 人机协同

| 模块 | 职责 |
|------|------|
| `src/human/humanState.ts` | 人机状态事件与转移的纯逻辑（idle / waiting_for_human）；createPendingAction。 |
| `src/human/humanCoordinator.ts` | 暂停（pauseForHuman）、恢复（resumeSession）、查询等待状态（getHumanWaitState）；恢复时可选调用 authDetector。 |

### 2.5 登录态

| 模块 | 职责 |
|------|------|
| `src/auth/authContextStore.ts` | auth context 元数据与 storage state 文件的路径约定、读写、删除、列表。 |
| `src/auth/authContextService.ts` | 保存/加载 auth context（写 Playwright storageState + 元数据）；解析 authContextId 为绝对路径供 create_session 加载。 |

### 2.6 安全与策略

| 模块 | 职责 |
|------|------|
| `src/security/domainGuard.ts` | 根据 allowDomains/denyDomains 判断 URL 是否允许访问。 |
| `src/security/redact.ts` | 对文本/对象做脱敏（邮箱、手机、token、长数字等）。 |
| `src/security/policy.ts` | 导出/分页策略（maxExportRows、maxPaginationPages）校验。 |

### 2.7 存储

| 模块 | 职责 |
|------|------|
| `src/storage/storage.ts` | StorageProvider 接口（readJson、writeJson、delete、exists、readText、writeText、list）。 |
| `src/storage/fileStorage.ts` | 基于文件系统的 StorageProvider 实现，路径基于 baseDir。 |
| `src/storage/jsonStore.ts` | 基于 StorageProvider 的简易 key-value 封装（可选，用于扩展）。 |

### 2.8 Tools 与 Resources 实现

- **tools/session/**：createSession、getSession、listSessions、closeSession 的入参校验与 SessionManager 调用。
- **tools/human/**：pauseForHuman、resumeSession、getHumanWaitState 与 HumanCoordinator 的对接。
- **tools/auth/**：saveAuthContext、loadAuthContext、listAuthContexts、deleteAuthContext 与 AuthContextService 的对接。
- **tools/page/**：navigate（含 domainGuard）、click、fill、selectOption、wait、scroll、screenshot 与 Adapter 的对接。
- **tools/extract/**：snapshot、extractText、extractTable、extractForm、getInteractiveElements 与 Adapter 的对接；并写入 latestExtractions 供 devassist/export 使用。
- **tools/devassist/**：generatePlaywrightScript、generatePageObject、generateDataSchema、exportExtractionResult；latestExtractions 缓存最近一次抽取。
- **resources/*.ts**：sessions、authContexts、latestSnapshot、latestExtraction、latestLogs 的数据组装与脱敏；latestLogs 依赖 appendSessionLog 写入的会话日志。

---

## 3. 数据与类型

- **types/common.ts**：SessionStatus、BrowserType、DetailLevel。
- **types/session.ts**：BrowserSessionMeta、PendingHumanAction，并导出 SessionStatus。
- **types/auth.ts**：AuthContextMeta。
- **types/snapshot.ts**：PageSnapshot、InteractiveElementSummary、KeySection、TableSummary、FormSummary。
- **types/extraction.ts**：TableExtractionResult、FormExtractionResult、FormFieldSchema、TextExtractionResult、InteractiveElementsResult。
- **types/error.ts**：ToolError、ToolErrorCode、createToolError。
- **types/tool.ts**：对上述类型的集中 re-export，供 tools 使用。

---

## 4. 部署与运行

- **进程模型**：单进程，通过 stdio 与 Cursor 通信；无内置 HTTP 服务。
- **状态**：会话、latestExtractions、sessionLogs 等均在进程内存；重启后会话与内存缓存清空，auth context 与导出文件仍保留在 data/ 下。
- **配置**：默认 `config/default.json`；CONFIG_PATH、LOG_LEVEL 等可通过环境变量覆盖。

---

## 5. 与需求文档的对应

- 功能与接口以 `docs/cursor_browser_mcp_engineering_requirements.md` 为准。
- 本架构实现该文档中的：MCP Server、Session/Human/Auth/Page/Extract/DevAssist 工具集、Resources、状态机、存储与安全要求；设计文档（本文档与 design.md）描述如何落地这些需求。
