# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Graceful shutdown: on SIGINT/SIGTERM, close all browser sessions before exit.
- Session limit: `browser.maxSessions` config (default 10); create_session fails when at limit.
- `SessionManager.closeAllSessions()` for shutdown and cleanup.
- `browser.handle_dialog` tool: set next native dialog (alert/confirm/prompt) response before triggering action.
- Config validation: storage `baseDir` is created if missing; browser timeouts capped (e.g. max 120s).
- Tool duration logging: `tool_completed` / `tool_failed` with `durationMs` and `sessionId` (for wrapped tools).
- Documentation: `docs/error-codes.md` (error codes and handling), `docs/configuration.md` (config reference), `CONTRIBUTING.md`.
- CI: GitHub Actions workflow for lint, build, and test.

### Changed

- SessionManager constructor accepts optional `SessionManagerOptions` (e.g. `maxSessions`).
- Config schema: `browser.launchTimeoutMs` and `actionTimeoutMs` max 120000.

### Fixed

- Fill tool: value is not logged (no change needed; already omitted in appendSessionLog).

---

## [0.1.0] - Initial release

- MCP Server with stdio transport.
- Session lifecycle: create, get, list, close.
- Human-in-the-loop: pause_for_human, resume_session, get_human_wait_state.
- Auth context: save, load, list, delete.
- Page actions: navigate, click, fill, select_option, wait, scroll, screenshot.
- Extraction: snapshot, extract_text, extract_table, extract_form, get_interactive_elements.
- Dev assist: generate_playwright_script, generate_page_object, generate_data_schema, export_extraction_result.
- Resources: browser://sessions, auth-contexts, latest-snapshot, latest-extraction, latest-logs.
- Security: domain allow/deny, redact, export/pagination limits.
- Design, architecture, and code-guide docs.
