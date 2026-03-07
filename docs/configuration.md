# 配置说明

配置文件默认为 `config/default.json`，可通过环境变量 `CONFIG_PATH` 指定路径。

## 配置项一览

| 路径 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| **browser** | | | |
| `browser.defaultType` | `'chromium'` | `chromium` | 浏览器类型（当前仅支持 chromium） |
| `browser.headless` | boolean | `false` | 是否无头模式 |
| `browser.launchTimeoutMs` | number | 8000 | 浏览器启动超时（毫秒），最大 120000 |
| `browser.actionTimeoutMs` | number | 10000 | 页面操作默认超时（毫秒），最大 120000 |
| `browser.maxSessions` | number | 10 | 最大并发会话数；超过时 create_session 报错 |
| **security** | | | |
| `security.domainWhitelistEnabled` | boolean | `true` | 为 `true` 时按 allow/deny 列表限制域名；为 `false` 时关闭域名白名单，不限制域名 |
| `security.allowDomains` | string[] | `[]` | 允许访问的域名列表（仅当 domainWhitelistEnabled 为 true 时生效）；为空且无 defaultAllow 时等效“全部禁止” |
| `security.denyDomains` | string[] | `[]` | 拒绝的域名列表（仅当 domainWhitelistEnabled 为 true 时生效，优先于 allow） |
| `security.allowPersistAuthContext` | boolean | true | 是否允许持久化登录态 |
| `security.maxExportRows` | number | 1000 | 单次导出最大行数 |
| `security.maxPaginationPages` | number | 10 | 分页最大页数 |
| **storage** | | | |
| `storage.baseDir` | string | `'./data'` | 数据根目录；启动时若不存在会自动创建 |
| **logging** | | | |
| `logging.level` | `'debug'\|'info'\|'warn'\|'error'` | `info` | 日志级别 |
| **snapshot** | | | |
| `snapshot.defaultDetailLevel` | `'minimal'\|'normal'\|'rich'` | `normal` | 默认快照详细程度 |

## 域名规则

- 当 `security.domainWhitelistEnabled` 为 **false** 时：不进行域名校验，任意 URL 均可导航。
- 当为 **true** 时：导航前校验 URL 的 host，先匹配 `denyDomains`，再匹配 `allowDomains`。
- `allowDomains` 为空且未配置 `defaultAllow` 时，任何域名均不允许（安全默认）。
- 子域名匹配：host 等于或以 `.<domain>` 结尾时视为匹配该条规则。

## 环境变量

- `CONFIG_PATH`：配置文件路径（覆盖默认 `config/default.json`）。
- `LOG_LEVEL`：部分运行时支持通过该变量覆盖日志级别（若实现）。
