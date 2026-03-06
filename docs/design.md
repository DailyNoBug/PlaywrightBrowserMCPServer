# Playwright Browser MCP Server — 设计文档

## 1. 设计目标与定位

### 1.1 产品定位

本系统是一个 **面向开发辅助场景的、人机协同的、支持登录后网页访问的 Browser MCP Server**。供 Cursor 等支持 MCP 的客户端接入，使 LLM/Agent 能够：

- 控制浏览器打开目标网站；
- 在遇到登录、MFA、验证码、扫码等场景时**显式暂停**并请求用户人工接管；
- 在用户完成操作后恢复自动化流程；
- 读取登录后页面的结构化信息并抽取数据；
- 基于当前页面与交互历史生成开发辅助内容（Playwright 脚本、页面对象、数据 schema 等）。

### 1.2 核心设计目标

| 目标 | 说明 |
|------|------|
| **人机协同** | 所有“需要人工处理”的流程建模为显式状态（如 `waiting_for_human`），不尝试自动绕过登录/验证码。 |
| **登录态可复用** | 支持将当前会话的 cookies/storage 保存为“auth context”，下次创建会话时加载，实现免登录访问。 |
| **结构化输出** | 默认只向 LLM 返回结构化摘要（快照、表格、表单 schema），不直接返回整页 HTML。 |
| **开发辅助优先** | 抽取与生成能力面向“代码生成、测试、数据 schema”等开发场景，而非通用爬虫。 |

### 1.3 边界与不做什么

- **不**实现验证码识别/破解；
- **不**实现 2FA 绕过；
- **不**在工具参数或持久化中托管明文账号密码；
- **不**提供规避权限、风控或服务条款的能力；
- **默认**只服务于用户有权限访问的网站（通过域名白名单与安全策略控制）。

---

## 2. 核心概念

### 2.1 Session（会话）

- **含义**：一次浏览器生命周期，对应一个 Playwright BrowserContext + Page。
- **状态**：`created` → `running` → 可转入 `waiting_for_human` / `completed` / `failed` / `closed`。
- **设计要点**：会话由 SessionManager 统一管理；状态仅通过受控方法迁移，并记录日志。

### 2.2 Human-in-the-Loop（人机协同）

- **含义**：当检测到或用户/Agent 明确需要人工介入时，会话进入 `waiting_for_human`，并记录原因与操作说明（`PendingHumanAction`）。
- **恢复**：用户完成操作后，Agent 调用 `browser.resume_session`，会话回到 `running`；可选地通过 authDetector 再判断当前页面是否已登录。
- **设计要点**：暂停/恢复均为显式 API，不依赖“超时后自动继续”等隐式行为。

### 2.3 Auth Context（登录态上下文）

- **含义**：将当前会话的 Playwright `storageState`（cookies、localStorage 等）持久化为命名实体，并绑定 domain、environment 等元数据。
- **用途**：下次 `create_session` 时通过 `authContextId` 或 `load_auth_context` 加载，实现同站免登录。
- **设计要点**：仅存 storage state，不存账号密码；删除 auth context 时同步删除底层文件。

### 2.4 页面快照与抽取

- **快照（Snapshot）**：当前页面的结构化摘要（标题、URL、可见文本摘要、关键区块、交互元素/表格/表单概况、生成时间），支持 `minimal` / `normal` / `rich` 三级。
- **抽取（Extraction）**：从当前页面提取表格数据、表单 schema、可见文本等，输出统一结构体；空结果有明确状态，不静默失败。

---

## 3. 数据流与调用关系

### 3.1 整体数据流

```
用户 / Cursor Agent
    ↓ (MCP 协议，stdio)
MCP Server (createServer)
    ↓ (registerTools / registerResources)
Tool Handlers / Resource Handlers
    ↓ (依赖注入 deps)
SessionManager, HumanCoordinator, AuthContextService, BrowserAdapter, Storage, Logger
    ↓
Playwright (仅通过 Adapter)、文件系统 (仅通过 StorageProvider)
```

- **Tool/Resource 层**：只通过 deps 访问 SessionManager、Adapter、Auth、Storage、Logger，不直接依赖 Playwright 或 `fs`。
- **业务层**：SessionManager 持有会话元数据与 handle；BrowserAdapter 封装所有浏览器操作；AuthContextService 负责登录态读写。
- **存储与浏览器**：通过抽象接口（StorageProvider、BrowserAdapter）访问，便于日后替换实现。

### 3.2 典型请求流：打开页面并捞取表格

1. Agent 调用 `browser.create_session`（可选 `authContextId`、`startUrl`）。
2. createSession 内部：SessionManager 生成 sessionId → Adapter.createSession → 若提供 authContextId 则加载对应 storageState；若提供 startUrl 则 navigate。
3. Agent 调用 `browser.navigate`（若未在 startUrl 中打开）：经 domainGuard 校验 → Adapter.navigate。
4. 若需人工登录：Agent 调用 `browser.pause_for_human` → HumanCoordinator 将会话置为 `waiting_for_human` 并写入 PendingHumanAction。
5. 用户完成操作后，Agent 调用 `browser.resume_session` → HumanCoordinator 恢复会话并可选调用 authDetector 判断当前页面登录状态。
6. Agent 调用 `browser.snapshot` 或 `browser.extract_table` → 通过 Adapter 在页面上下文中执行脚本并返回结构化结果。
7. 用完后 Agent 调用 `browser.close_session`，SessionManager 与 Adapter 销毁会话与浏览器资源。

---

## 4. 状态机设计

### 4.1 Session 状态转移

```
created → running | failed | closed
running → waiting_for_human | completed | failed | closed
waiting_for_human → running | failed | closed
completed → closed
failed → closed
```

- 仅通过 SessionManager 的受控方法（如 `setStatus`）变更状态；非法转移抛错。
- 状态变更时若注入了 logger，则记录 `session_status_changed` 事件。

### 4.2 Human 状态（逻辑层）

- **idle**：当前无等待人工。
- **waiting_for_human**：会话处于“等待用户操作”状态。
- 事件：`pause_requested`、`auth_required_detected`、`human_completed`、`resume_requested`、`session_invalid`、`timeout_expired` 等，用于纯逻辑测试与扩展。

---

## 5. 安全与策略设计

### 5.1 域名控制

- 所有 `navigate` 前经 **domainGuard** 校验：仅允许 `allowDomains` 且未命中 `denyDomains` 的 URL；未命中规则时默认拒绝（或由配置决定）。
- 配置来自 `config/default.json` 的 `security.allowDomains` / `security.denyDomains`。

### 5.2 敏感数据

- **不存储**明文账号密码；登录由用户在浏览器中手动完成。
- **fill** 工具存在，但日志层对 value 做掩码/不记录。
- **脱敏（redact）**：对日志、导出结果、页面文本中的邮箱、手机号、token、cookie、长数字串等做脱敏后再输出或落盘。

### 5.3 导出与分页策略

- **policy** 模块：限制最大导出行数（`maxExportRows`）、最大分页页数（`maxPaginationPages`）。
- 导出前检查策略，超限则返回明确错误，不静默截断（除非业务明确约定截断策略）。

---

## 6. 错误设计

### 6.1 统一错误结构

所有对 MCP 暴露的失败均通过 **ToolError** 表达：

- `errorCode`：如 `SESSION_NOT_FOUND`、`NAVIGATION_FAILED`、`ELEMENT_NOT_FOUND`、`TIMEOUT`、`DOMAIN_NOT_ALLOWED`、`HUMAN_ACTION_REQUIRED` 等。
- `message`：可读说明。
- 可选 `details`、`retryable`。

### 6.2 错误映射

- Playwright 超时 → `TIMEOUT`
- 选择器未找到 / 元素不可见 → `ELEMENT_NOT_FOUND` / `ELEMENT_NOT_INTERACTABLE`
- 导航失败 → `NAVIGATION_FAILED`
- 会话不存在 → `SESSION_NOT_FOUND`
- 域名不允许 → `DOMAIN_NOT_ALLOWED`
- 需要人工介入 → `HUMAN_ACTION_REQUIRED`

Tool handler 与 Adapter 层将底层异常映射为上述结构后，再以统一形式返回给 MCP 客户端，不直接抛出原始 Playwright 错误。

---

## 7. 配置与扩展点

### 7.1 配置

- **来源**：默认 `config/default.json`，可通过环境变量 `CONFIG_PATH` 指定路径。
- **校验**：启动时使用 Zod 校验，不合法则阻止启动并输出结构化错误。
- **主要项**：browser（类型、headless、超时）、security（allow/deny 域名、是否允许持久化登录态、导出/分页上限）、storage（baseDir）、logging（level）、snapshot（defaultDetailLevel）。

### 7.2 扩展方向（不改变当前设计前提）

- 将 BrowserAdapter 换为远程浏览器 Provider；
- 将 StorageProvider 换为 SQLite/对象存储；
- 多用户/多租户下对 auth context 做隔离；
- 针对特定站点的登录/检测规则插件；
- 更丰富的页面语义抽取与开发辅助生成。

---

## 8. 文档与需求追溯

- 详细功能与接口清单见：`docs/cursor_browser_mcp_engineering_requirements.md`。
- 架构与模块划分见：`docs/architecture.md`。
- 各目录与文件职责见：`docs/code-guide.md`。
