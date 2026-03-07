# Playwright Browser MCP Server

登录态人机协同 Browser MCP Server，供 Cursor 等 MCP 客户端接入。支持在需要登录/MFA/验证码时暂停并交由用户处理，保存与复用登录态，抽取登录后页面数据并生成开发辅助内容。

## 技术栈

- Node.js 20+
- TypeScript
- Playwright
- @modelcontextprotocol/sdk
- Zod / pino

## 文档

| 文档 | 说明 |
|------|------|
| [设计文档](docs/design.md) | 设计目标、核心概念、数据流、状态机、安全与错误设计 |
| [架构文档](docs/architecture.md) | 分层结构、模块划分、技术选型、依赖关系 |
| [代码指南](docs/code-guide.md) | 各目录与文件的职责说明，每部分代码做了什么 |
| [工程需求](docs/cursor_browser_mcp_engineering_requirements.md) | 功能与接口规格、推荐目录结构、实现细节 |
| [错误码说明](docs/error-codes.md) | ToolError 错误码、含义与处理建议 |
| [配置说明](docs/configuration.md) | 配置项一览、域名规则、环境变量 |

## 快速开始

```bash
npm install
npm run build
npm run dev   # 以 stdio 方式启动，供 Cursor 连接
```

**验证功能（访问真实网站）**：集成测试会启动无头浏览器访问 example.com 并做快照，确保整条链路正常。

```bash
npx playwright install chromium   # 首次需安装浏览器
npm run test:integration
```

---

## 在 Cursor 中接入本 MCP 服务

本服务通过 **stdio** 与 Cursor 通信，按以下任一方式配置即可在 Cursor 中使用所有 `browser.*` 工具。

> **使用前必须先构建**  
> 若 MCP 配置里用的是 `dist/index.js`，必须先在本仓库根目录执行：
> ```bash
> cd /home/lsc/repo/playwright-mcp-server   # 换成你的仓库路径
> npm install
> npm run build
> ```
> 否则会报 **Cannot find module '.../dist/index.js'**。构建成功后才会生成 `dist/` 目录。

### 方式一：Cursor 设置界面

1. 打开 **Cursor** → **Settings**（`Ctrl+,` / `Cmd+,`）→ 左侧选择 **MCP**。
2. 点击 **Add new MCP server**（或 **Edit Config** 打开 MCP 配置文件）。
3. 在配置中新增一个 server。**`command` 请填 `node` 的绝对路径**（终端执行 `which node` 可得），否则可能报 `spawn node ENOENT`：

```json
{
  "mcpServers": {
    "playwright-browser": {
      "command": "/你的/node/绝对路径/bin/node",
      "args": ["/绝对路径/到/playwright-mcp-server/dist/index.js"],
      "cwd": "/绝对路径/到/playwright-mcp-server"
    }
  }
}
```

将 `command` 改为你本机 `which node` 的输出；将两处 `/绝对路径/到/playwright-mcp-server` 替换为本仓库实际路径（例如 `/home/lsc/repo/playwright-mcp-server`）。

4. 保存后重启 Cursor，或重新加载 MCP，即可在对话中使用该服务。

### 方式二：直接编辑 MCP 配置文件

MCP 配置通常位于：

- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/cursor.mcp/mcp.json`

在 `mcp.json` 的 `mcpServers` 里增加（**重要：见下方「若出现 spawn node ENOENT」**）：

```json
"playwright-browser": {
  "command": "<node 的绝对路径>",
  "args": ["<本仓库绝对路径>/dist/index.js"],
  "cwd": "<本仓库绝对路径>"
}
```

**使用开发模式（不先 build）** 时，可用 tsx 的绝对路径：

```json
"playwright-browser": {
  "command": "<node 的绝对路径>",
  "args": ["<本仓库绝对路径>/node_modules/.bin/tsx", "src/index.ts"],
  "cwd": "<本仓库绝对路径>"
}
```

### 若出现 `spawn node ENOENT`

Cursor 从图形界面启动时，**不会继承终端里的 PATH**（例如 nvm/fnm 安装的 `node` 只在终端可用），因此用 `"command": "node"` 会报错 **spawn node ENOENT**。

**处理方式：在配置里写 `node` 的绝对路径。**

在终端执行（在已装好 Node 的环境下）：

```bash
which node
```

把输出路径填到 MCP 配置的 `command` 里，例如：

- nvm：`/home/你的用户名/.nvm/versions/node/v20.x.x/bin/node`
- fnm：`/home/你的用户名/.local/share/fnm/aliases/default/bin/node`
- 系统包管理：`/usr/bin/node`

示例（按你的实际路径改）：

```json
"playwright-browser": {
  "command": "/home/lsc/.nvm/versions/node/v20.10.0/bin/node",
  "args": ["/home/lsc/repo/playwright-mcp-server/dist/index.js"],
  "cwd": "/home/lsc/repo/playwright-mcp-server"
}
```

保存后重载 MCP 或重启 Cursor 即可。

### 若仍报 ENOENT（例如 Cursor 为 Flatpak/沙箱）

即使用 `which node` 的绝对路径仍报 **spawn ... ENOENT**，多半是 Cursor 运行在沙箱里，访问不到 `~/.nvm` 下的 node。

**改用仓库里的包装脚本**，让脚本在 bash 里加载 nvm 再启动 node：

1. 赋予执行权限（在终端、本仓库根目录下执行一次）：
   ```bash
   chmod +x /home/lsc/repo/playwright-mcp-server/scripts/run-mcp.sh
   ```

2. MCP 配置里用**脚本绝对路径**作为 `command`，`args` 里只写入口相对路径，并设好 `cwd`：
   ```json
   "playwright-browser": {
     "command": "/home/lsc/repo/playwright-mcp-server/scripts/run-mcp.sh",
     "args": ["dist/index.js"],
     "cwd": "/home/lsc/repo/playwright-mcp-server"
   }
   ```
   将路径改成你本机仓库的实际路径。

3. 保存配置后重载 MCP 或重启 Cursor。

脚本会依次尝试加载 nvm、fnm，再执行 `node`，一般能解决沙箱下找不到 node 的问题。

若脚本仍无法运行，可安装系统级 Node 后改用其路径（沙箱通常能访问 `/usr/bin`）：
```bash
sudo apt install nodejs   # 或你的发行版等价命令
```
然后在 MCP 配置里使用 `"command": "/usr/bin/node"`（或 `which node` 在系统安装后的输出）。

### 配置说明

| 字段 | 说明 |
|------|------|
| `command` | **推荐写 node 的绝对路径**（避免 ENOENT）；已 build 时用 node，开发时也可用 node + tsx。 |
| `args` | 参数：已 build 时用 `["dist/index.js"]`；开发时用 `["node_modules/.bin/tsx", "src/index.ts"]`。 |
| `cwd` | 工作目录，必须为本仓库根目录，以便正确读取 `config/`、`data/` 等。 |

### 验证是否生效

- 在 Cursor 对话中应能看到并调用以 `browser.` 开头的工具（如 `browser.create_session`、`browser.navigate` 等）。
- 若未出现，请确认路径无误、已执行 `npm install` 且（若用 node）已执行 `npm run build`，然后重载 MCP 或重启 Cursor。

### 若报 `Cannot find module '.../dist/index.js'`

说明还没有构建。在**本仓库根目录**的终端执行：

```bash
npm install
npm run build
```

看到 `dist/` 目录和其中的 `index.js` 后再重载 MCP。

---

## 如何让 Cursor Agent 用人机协同方式捞取网站信息

接入本 MCP 后，在对话里**用自然语言把「要登录、要你等我操作」说清楚**，Agent 就会按人机协同流程调用 `browser.*` 工具。可按下面方式描述任务。

### 推荐描述方式（直接复制或改写）

**任务描述模板：**

> 用 **playwright-browser MCP** 帮我打开 [目标网址]，并捞取 [具体要的内容：表格/表单/正文]。  
> 如果需要登录、验证码或扫码，请先调用 `browser.pause_for_human` 暂停，等我在浏览器里手动完成后再调用 `browser.resume_session` 继续；完成后把结果用 `browser.snapshot` 或 `browser.extract_table`/`extract_text` 等工具取出来给我。

**示例 1（登录后表格）：**

> 用 browser MCP 打开 https://example.com/dashboard，捞取页面上第一个表格的数据。如果需要登录，先 pause 让我在浏览器里登录，我再跟你说「继续」后你 resume，然后做 snapshot 或 extract_table 把结果给我。

**示例 2（保存登录态下次用）：**

> 用 browser MCP 打开 https://app.example.com，先 navigate 过去；如果跳到登录页就 pause_for_human 让我登录。我登录好后你 resume_session，然后调用 save_auth_context 把当前登录态存成名为 "example-app"、domain 为 "app.example.com"，下次 create_session 时用 load_auth_context 或 authContextId 直接带登录态打开。

**示例 3（只要页面摘要）：**

> 用 playwright-browser MCP 打开 [URL]，需要登录的话先 pause 让我处理，你 resume 后用 browser.snapshot 把页面摘要（标题、链接、表格/表单概况）给我，不要整页 HTML。

### 人机协同标准流程（供 Agent 参考）

1. **创建会话**：`browser.create_session`（可选 `startUrl` 或 `authContextId` 复用登录态）。
2. **打开页面**：`browser.navigate`（仅允许 `config` 里配置的域名）。
3. **遇到登录/验证码/扫码**：调用 `browser.pause_for_human`，`reason` 填 `LOGIN_REQUIRED` / `MFA_REQUIRED` / `CAPTCHA_REQUIRED` 等，`instructions` 里写明要用户做什么。
4. **用户完成操作后**：用户说「已登录 / 继续」后，调用 `browser.resume_session` 恢复。
5. **捞取信息**：用 `browser.snapshot` 看页面结构，再用 `browser.extract_text` / `browser.extract_table` / `browser.extract_form` 按需抽取。
6. **可选**：需要下次免登录时用 `browser.save_auth_context`；用完后 `browser.close_session`。

对 Agent 说「按上面人机协同流程、用 browser MCP 捞取……」即可引导其按此顺序调用工具。

### 关键工具速查

| 目的           | 工具 |
|----------------|------|
| 打开网站       | `browser.create_session` + `browser.navigate` |
| 需要人工登录/验证时暂停 | `browser.pause_for_human` |
| 用户做完后继续 | `browser.resume_session` |
| 看当前页面摘要 | `browser.snapshot` |
| 抽表格/正文/表单 | `browser.extract_table` / `extract_text` / `extract_form` |
| 存登录态下次用 | `browser.save_auth_context` |
| 下次带登录态打开 | `browser.create_session` 时传 `authContextId` |

### 配置域名白名单

要访问的域名必须在 `config/default.json` 的 `security.allowDomains` 里，否则 `navigate` 会报 `DOMAIN_NOT_ALLOWED`。新增域名后重启或重载 MCP 即可。

### Cursor Skill

本仓库提供 **Agent Skill**，用于规范调用本 MCP 的人机协同流程。Skill 位于：

- **路径**：`.cursor/skills/playwright-browser-mcp/SKILL.md`
- **作用**：当用户提到「browser MCP」「人机协同捞取」「登录后抓取」等时，Agent 会按该技能中的流程调用 `browser.*` 工具（create_session → navigate → 遇登录则 pause_for_human → 用户完成后 resume_session → snapshot/extract_*）。
- **使用**：在 Cursor 中打开本仓库即可；无需额外配置，Agent 会根据描述自动匹配该技能。

---

## 配置

- 默认配置：`config/default.json`
- 环境变量 `CONFIG_PATH` 可指定配置文件路径
- 环境变量 `LOG_LEVEL` 可覆盖日志级别

## 工程阶段

1. 项目骨架 ✅
2. Session 与 Browser Adapter ✅
3. Human-in-the-loop ✅
4. Auth Context ✅
5. 页面抽取 ✅
6. 安全与导出 ✅
7. 开发辅助 ✅

详见 `docs/cursor_browser_mcp_engineering_requirements.md`。

## MCP Tools

- **Session**: `browser.create_session`, `browser.get_session`, `browser.list_sessions`, `browser.close_session`
- **Human**: `browser.pause_for_human`, `browser.resume_session`, `browser.get_human_wait_state`
- **Auth**: `browser.save_auth_context`, `browser.load_auth_context`, `browser.list_auth_contexts`, `browser.delete_auth_context`
- **Page**: `browser.navigate`, `browser.click`, `browser.fill`, `browser.select_option`, `browser.wait`, `browser.scroll`, `browser.take_screenshot`, `browser.handle_dialog`
- **Extract**: `browser.snapshot`, `browser.extract_text`, `browser.extract_table`, `browser.extract_form`, `browser.get_interactive_elements`
- **DevAssist**: `browser.generate_playwright_script`, `browser.generate_page_object`, `browser.generate_data_schema`, `browser.export_extraction_result`
