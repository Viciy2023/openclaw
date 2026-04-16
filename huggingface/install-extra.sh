#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"
OPENCLAW_CHINA_PLUGIN_PACKAGE="${OPENCLAW_CHINA_PLUGIN_PACKAGE:-@openclaw-china/channels}"
OPENCLAW_AGENT_BROWSER_PACKAGE="${OPENCLAW_AGENT_BROWSER_PACKAGE:-agent-browser@latest}"
OPENCLAW_DDG_SKILL="${OPENCLAW_DDG_SKILL:-ddg-web-search}"
OPENCLAW_N2_SKILL="${OPENCLAW_N2_SKILL:-n2-free-search}"
OPENCLAW_TAVILY_PACKAGE="${OPENCLAW_TAVILY_PACKAGE:-tavily-python}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

hf_ensure_tree

# 统一的重试执行器。
# 对需要联网安装的操作统一做 3 次重试，减少 HF 启动时的瞬时网络波动影响。
run_with_retry() {
  local description="$1"
  shift
  local attempt
  local max_attempts=3
  local delay_seconds=10

  for attempt in $(seq 1 "${max_attempts}"); do
    if "$@"; then
      hf_log INFO "${description} succeeded on attempt ${attempt}"
      return 0
    fi
    if [[ "${attempt}" -lt "${max_attempts}" ]]; then
      hf_log WARN "${description} failed on attempt ${attempt}; retrying in ${delay_seconds}s"
      sleep "${delay_seconds}"
    fi
  done

  hf_log ERROR "${description} failed after ${max_attempts} attempts"
  return 1
}

# 检查统一中国渠道插件是否已经安装。
# 这里优先读取 `openclaw plugins list --json`，避免重复安装导致每次启动都走 npm。
has_openclaw_china_channels() {
  if [[ -d "/root/.openclaw/extensions/channels" ]]; then
    return 0
  fi
  return 1
}

# 在 HF 场景下统一使用“已安装则更新、未安装则安装”的策略。
# 这样容器每次启动都能自动追到 openclaw-china 的最新版本，同时仍然不依赖交互式 china setup。
sync_openclaw_china_channels() {
  if has_openclaw_china_channels; then
    # 插件目录已存在时直接复用，避免每次启动都联网 update 拖慢 HF 冷启动。
    hf_log INFO "OpenClaw China channels plugin already installed; skipping reinstall"
    return 0
  fi

  hf_log INFO "installing OpenClaw China channels plugin: ${OPENCLAW_CHINA_PLUGIN_PACKAGE}"
  openclaw plugins install "${OPENCLAW_CHINA_PLUGIN_PACKAGE}"
}

# 检查 agent-browser CLI 是否已可用。
has_agent_browser() {
  command -v agent-browser >/dev/null 2>&1
}

# 安装或更新 agent-browser，并执行浏览器依赖安装。
# 该工具是 HF 环境下必须启用的浏览器能力。
sync_agent_browser() {
  if has_agent_browser; then
    hf_log INFO "agent-browser already installed; skipping npm reinstall"
  else
    hf_log INFO "installing agent-browser CLI: ${OPENCLAW_AGENT_BROWSER_PACKAGE}"
    run_with_retry "agent-browser npm install" npm install -g "${OPENCLAW_AGENT_BROWSER_PACKAGE}"
  fi

  if [[ -d "/root/.agent-browser/browsers" ]] && find /root/.agent-browser/browsers -mindepth 1 -maxdepth 1 -type d | grep -q .; then
    hf_log INFO "agent-browser browser payload already present; skipping browser reinstall"
    return 0
  fi

  run_with_retry "agent-browser browser install" agent-browser install --with-deps
}

# 检查 Python Tavily 包是否已安装。
has_tavily_python() {
  python3 - <<'EOF'
import importlib.util
raise SystemExit(0 if importlib.util.find_spec("tavily") else 1)
EOF
}

# 安装 Tavily Python SDK。
# HF 已通过环境变量提供 TAVILY_API_KEY，这里只负责安装 SDK。
sync_tavily_python() {
  if has_tavily_python; then
    hf_log INFO "tavily-python already installed; skipping pip reinstall"
    return 0
  fi

  hf_log INFO "installing tavily-python package"

  run_with_retry "tavily-python pip install" python3 -m pip install --no-cache-dir --break-system-packages --upgrade "${OPENCLAW_TAVILY_PACKAGE}"
}

# 统一安装 ClawHub 搜索技能到共享技能目录。
# ddg-web-search 与 n2-free-search 都按技能安装，便于后续被 OpenClaw 工具链发现。
sync_clawhub_skill() {
  local skill_name="$1"
  local target_dir="/root/.openclaw/workspace/skills/${skill_name}"

  mkdir -p /root/.openclaw/workspace/skills

  if [[ -d "${target_dir}" ]]; then
    hf_log INFO "skill ${skill_name} already present; skipping reinstall"
    return 0
  fi

  hf_log INFO "installing skill ${skill_name}"

  run_with_retry "clawhub install ${skill_name}" bash -lc "cd /root/.openclaw/workspace && npx -y clawhub@latest install ${skill_name} --force"
}

# 安装需要的搜索类工具与技能。
sync_search_tools() {
  sync_clawhub_skill "${OPENCLAW_DDG_SKILL}"
  sync_clawhub_skill "${OPENCLAW_N2_SKILL}"
  sync_tavily_python
}

hf_log INFO "running install-extra hook"

# 浏览器缓存、第三方插件安装产物、搜索技能目录都保留在运行层，避免把大体积安装内容同步进 HF 桶。
# 这样会牺牲首次启动后的部分复用速度，但能显著减小 /data/openclaw 体积。

sync_openclaw_china_channels
sync_agent_browser
sync_search_tools

if [[ -x "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh" ]]; then
  hf_log INFO "executing persisted install hook"
  "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh"
else
  hf_log INFO "no persisted install hook found; skipping"
fi
