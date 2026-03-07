# 错误码说明

MCP 工具失败时，会返回结构化的 `ToolError`（JSON 序列化在错误消息中），包含以下字段：

- **errorCode**: 错误码枚举
- **message**: 可读说明
- **details**: 可选，额外信息
- **retryable**: 可选，是否建议重试

## 错误码一览

| 错误码 | 含义 | 常见原因 | 建议 |
|--------|------|----------|------|
| `INVALID_INPUT` | 入参不合法或业务规则不满足 | 参数缺失/格式错误、超过最大 session 数等 | 检查入参与配置限制 |
| `SESSION_NOT_FOUND` | 会话不存在或已关闭 | sessionId 错误、会话已被 close | 使用 list_sessions 确认或重新 create_session |
| `BROWSER_START_FAILED` | 浏览器启动失败 | 超时、缺少 Chromium、权限问题 | 检查环境与 launchTimeoutMs，可重试 |
| `NAVIGATION_FAILED` | 导航失败 | 网络错误、超时、目标页不可达 | 检查 URL 与网络，可重试 |
| `ELEMENT_NOT_FOUND` | 未找到元素 | 选择器错误、元素尚未出现、在 iframe 内 | 用 snapshot 确认 DOM，调整选择器或等待 |
| `ELEMENT_NOT_INTERACTABLE` | 元素不可交互 | 被遮挡、disabled、不可见 | 先 scroll 或 wait，再操作 |
| `TIMEOUT` | 操作超时 | 页面加载慢、元素迟迟不出现 | 增大 timeoutMs 或重试 |
| `AUTH_CONTEXT_INVALID` | 登录态上下文无效 | authContextId 不存在或文件损坏 | 重新登录并 save_auth_context |
| `HUMAN_ACTION_REQUIRED` | 需要人工介入 | 当前流程设计为必须用户操作（如登录、验证码） | 调用 pause_for_human，用户操作后 resume_session |
| `PERMISSION_DENIED` | 权限拒绝 | 配置或策略不允许该操作 | 检查安全与导出策略配置 |
| `DOMAIN_NOT_ALLOWED` | 域名不允许 | URL 不在 allowDomains 或命中 denyDomains | 修改 security 配置或使用允许的域名 |
| `EXPORT_FAILED` | 导出失败 | 写入文件失败、超过行数限制 | 检查 baseDir 与 maxExportRows |
| `STORAGE_FAILED` | 存储操作失败 | 读写 auth context 或文件失败 | 检查 data 目录权限与磁盘 |
| `UNKNOWN_ERROR` | 未分类错误 | 其他异常 | 查看日志与 message 排查 |

## 安全与策略相关

- **allowDomains 为空**：未配置 `defaultAllow` 时，视为“全部禁止”，只有显式配置的 allow 列表中的域名可访问。详见 `config/schema.ts` 与 `security/domainGuard.ts`。
- **maxExportRows / maxPaginationPages**：导出或分页超过限制会返回明确错误，不会静默截断（除非业务另有约定）。

## 日志与排查

- 工具调用会记录 `tool_completed` / `tool_failed` 及 `durationMs`、`sessionId`，便于排查慢调用与失败会话。
- 启动失败时会在 stderr 输出 JSON 格式的 `config_load_failed` 或 `server_start_failed`。
