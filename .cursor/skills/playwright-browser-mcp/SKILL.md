---
name: playwright-browser-mcp
description: Uses the playwright-browser MCP server for human-in-the-loop web capture. Apply when the user wants to open a website, scrape or extract data from a page (tables, forms, text), especially when login, MFA, captcha, or QR scan is required. Use when the user mentions "browser MCP", "人机协同", "登录后捞取", "打开网站并抓取", or needs to save/reuse login state for a site.
---

# Playwright Browser MCP 使用技能

本技能指导 Agent 通过 **playwright-browser** MCP 进行人机协同的网页访问与数据捞取：在需要登录、验证码、扫码时暂停交由用户操作，恢复后继续抽取页面内容。

## 何时使用本技能

- 用户要求打开某个网址并获取页面内容（表格、表单、正文）。
- 目标站点需要登录、MFA、验证码或扫码，且用户愿意在浏览器中手动完成。
- 用户希望保存登录态以便下次免登录访问同一站点。
- 用户提到「用 browser MCP」「playwright MCP」「人机协同捞取」「登录后抓取」等。

## 前置条件

- 本仓库的 MCP 已按 README 接入 Cursor（`playwright-browser` 或 `user-playwright-browser`）。
- 要访问的域名已加入 `config/default.json` 的 `security.allowDomains`，否则 `browser.navigate` 会报 `DOMAIN_NOT_ALLOWED`。

## 标准人机协同流程

按以下顺序调用工具，遇登录/验证码时显式暂停并提示用户。

1. **创建会话**  
   - 调用 `browser.create_session`。  
   - 若用户之前存过该站登录态，在 `authContextId` 或创建后 `browser.load_auth_context` 中指定对应 auth context。  
   - 可选：`startUrl` 直接打开首屏。

2. **打开目标页**  
   - 调用 `browser.navigate`，传入 `sessionId` 与目标 `url`。  
   - 若返回错误或后续检测到登录页，进入步骤 3。

3. **需要人工处理时暂停**  
   - 调用 `browser.pause_for_human`，传入：  
     - `sessionId`  
     - `reason`：`LOGIN_REQUIRED` | `MFA_REQUIRED` | `CAPTCHA_REQUIRED` | `SCAN_REQUIRED` | `USER_REQUESTED_PAUSE`  
     - `instructions`：简短说明要用户做什么（例如「请在浏览器中完成登录，完成后回复“继续”」）。  
   - 在回复中明确告诉用户：浏览器已暂停，请在本机打开的浏览器窗口中完成登录/验证，完成后回复「继续」或「已登录」。

4. **用户完成后的恢复**  
   - 当用户表示已完成后，调用 `browser.resume_session` 传入同一 `sessionId`。  
   - 根据返回的 `authState` 判断是否已登录，再继续后续步骤。

5. **捞取页面信息**  
   - 先调用 `browser.snapshot` 获取页面摘要（标题、链接、表格/表单概况）。  
   - 再按需调用：  
     - `browser.extract_table`：表格数据  
     - `browser.extract_text`：正文  
     - `browser.extract_form`：表单结构  
     - `browser.get_interactive_elements`：可点击/可输入元素列表。

6. **可选：保存登录态**  
   - 若用户希望下次免登录，调用 `browser.save_auth_context`，传入 `sessionId`、`name`、`domain`，可选 `environment`。  
   - 之后创建新会话时可在 `browser.create_session` 中传 `authContextId`，或先创建再 `browser.load_auth_context`。

7. **收尾**  
   - 用完后调用 `browser.close_session` 关闭会话。

## 关键工具速查

| 目的 | 工具 | 说明 |
|------|------|------|
| 创建浏览器会话 | `browser.create_session` | 可传 `startUrl`、`authContextId`（复用登录态） |
| 打开/跳转 | `browser.navigate` | 需在 `allowDomains` 内 |
| 需要人工时暂停 | `browser.pause_for_human` | 必填 `reason`、`instructions` |
| 用户完成后继续 | `browser.resume_session` | 恢复后检查 `authState` |
| 查是否在等人 | `browser.get_human_wait_state` | 确认当前是否 `waiting_for_human` |
| 页面摘要 | `browser.snapshot` | 可选 `detailLevel`: minimal / normal / rich |
| 抽表格/正文/表单 | `browser.extract_table` / `extract_text` / `extract_form` | 按需选用 |
| 交互元素列表 | `browser.get_interactive_elements` | 按钮、链接、输入框等 |
| 保存登录态 | `browser.save_auth_context` | 需 `name`、`domain` |
| 列出/加载/删除登录态 | `browser.list_auth_contexts` / `load_auth_context` / `delete_auth_context` | 管理已存登录态 |
| 关闭会话 | `browser.close_session` | 用完后调用 |

## 错误与约束

- **DOMAIN_NOT_ALLOWED**：目标 URL 的域名不在 `security.allowDomains` 中，需用户修改 `config/default.json` 并重载。
- **SESSION_NOT_FOUND**：会话已关闭或 id 错误，需重新 `create_session`。
- **HUMAN_ACTION_REQUIRED**：当前处于等待人工状态，应提示用户完成操作后再说「继续」，再调用 `resume_session`。
- 不在工具中传明文账号密码；登录由用户在浏览器中手动完成。
- `browser.fill` 的 value 不会写入普通日志，可用于敏感输入，但仍需用户自行在浏览器中操作登录。

## 示例话术（供用户对 Agent 说）

- 「用 playwright-browser MCP 打开 https://example.com/dashboard，捞第一个表格；要登录就先 pause 让我登录，我说继续后你 resume 再 extract_table。」
- 「用 browser MCP 打开某后台 URL，需要登录就 pause，我登录好后你 resume 并 save_auth_context 存成 name=my-app domain=app.example.com，下次用 authContextId 打开。」
- 「用 browser MCP 打开 [URL]，只要页面摘要，用 snapshot 给我，不要整页 HTML；要登录就按人机协同流程 pause/resume。」

## 参考

- 项目 README：接入方式、配置、域名白名单。
- `config/default.json`：`security.allowDomains`、`browser`、`snapshot.defaultDetailLevel` 等。
