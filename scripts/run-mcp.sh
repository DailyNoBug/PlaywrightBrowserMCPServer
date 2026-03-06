#!/usr/bin/env bash
# 供 Cursor MCP 调用的包装脚本：加载 nvm/fnm 后启动 node，避免 spawn node ENOENT。
# MCP 配置：command 填本脚本绝对路径，args 填 ["dist/index.js"]，cwd 填本仓库根目录。

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# 加载 nvm（若存在）
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  . "$HOME/.nvm/nvm.sh"
fi

# 加载 fnm（若存在）
if command -v fnm &>/dev/null; then
  eval "$(fnm env)"
fi

exec node "$@"
