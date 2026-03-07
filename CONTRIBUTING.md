# 贡献指南

感谢你考虑为本项目做贡献。

## 开发环境

- Node.js 20+
- 本仓库克隆后执行：

```bash
npm install
npm run build
npm test
```

## 分支与提交

- 新功能或修复请在单独分支上开发（如 `feature/xxx`、`fix/xxx`）。
- 提交信息尽量清晰，可参考 Conventional Commits（如 `feat: add handle_dialog`、`fix: session limit check`）。

## 提交流程

1. Fork 本仓库并克隆到本地。
2. 创建分支，完成修改。
3. 运行 `npm run build` 和 `npm test`，确保通过。
4. 提交 PR 到主仓库的 `main`（或当前默认分支）。
5. 维护者 review 后合并。

## 代码与测试

- 新增或修改 MCP 工具时，请同步更新 `docs/code-guide.md` 和（若涉及）`docs/architecture.md`。
- 新增配置项请更新 `config/default.json`、`src/config/schema.ts` 和 `docs/configuration.md`。
- 尽量为关键逻辑补充单元测试（`tests/unit/`），CI 会运行 `npm test`。

## 文档

- 设计/架构/代码说明：`docs/design.md`、`docs/architecture.md`、`docs/code-guide.md`。
- 错误码与配置：`docs/error-codes.md`、`docs/configuration.md`。
- 功能与接口规格：`docs/cursor_browser_mcp_engineering_requirements.md`。

如有疑问，可提 Issue 讨论。
