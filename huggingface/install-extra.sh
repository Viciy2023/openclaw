#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"
OPENCLAW_DDG_SKILL="${OPENCLAW_DDG_SKILL:-ddg-web-search}"
OPENCLAW_N2_SKILL="${OPENCLAW_N2_SKILL:-n2-free-search}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

hf_ensure_tree

ensure_prebuilt_extension() {
  local extension_id="$1"
  local runtime_dir="/root/.openclaw/extensions/${extension_id}"
  local prebuilt_dir="${OPENCLAW_HF_APP_DIR}/prebuilt/extensions/${extension_id}"

  mkdir -p "/root/.openclaw/extensions"

  if [[ -d "${runtime_dir}" ]]; then
    hf_log INFO "extension ${extension_id} already present at ${runtime_dir}"
    return 0
  fi

  if [[ ! -d "${prebuilt_dir}" ]]; then
    hf_log ERROR "prebuilt extension ${extension_id} is missing at ${prebuilt_dir}"
    return 1
  fi

  cp -a "${prebuilt_dir}" "${runtime_dir}"
  hf_log INFO "restored prebuilt extension ${extension_id} from ${prebuilt_dir}"
}

ensure_prebuilt_skill() {
  local skill_name="$1"
  local runtime_dir="/root/.openclaw/workspace/skills/${skill_name}"
  local prebuilt_dir="${OPENCLAW_HF_APP_DIR}/prebuilt/skills/${skill_name}"

  mkdir -p "/root/.openclaw/workspace/skills"

  if [[ -d "${runtime_dir}" ]]; then
    hf_log INFO "skill ${skill_name} already present at ${runtime_dir}"
    return 0
  fi

  if [[ ! -d "${prebuilt_dir}" ]]; then
    hf_log ERROR "prebuilt skill ${skill_name} is missing at ${prebuilt_dir}"
    return 1
  fi

  cp -a "${prebuilt_dir}" "${runtime_dir}"
  hf_log INFO "restored prebuilt skill ${skill_name} from ${prebuilt_dir}"
}

has_tavily_python() {
  python3 - <<'EOF'
import importlib.util
raise SystemExit(0 if importlib.util.find_spec("tavily") else 1)
EOF
}

has_pillow() {
  python3 - <<'EOF'
import importlib.util
raise SystemExit(0 if importlib.util.find_spec("PIL") else 1)
EOF
}

require_agent_browser() {
  if ! command -v agent-browser >/dev/null 2>&1; then
    hf_log ERROR "agent-browser CLI is missing; bake it into the image during Docker build"
    return 1
  fi

  if command -v chromium >/dev/null 2>&1; then
    hf_log INFO "using system chromium at $(command -v chromium)"
    return 0
  fi

  if command -v chromium-browser >/dev/null 2>&1; then
    hf_log INFO "using system chromium-browser at $(command -v chromium-browser)"
    return 0
  fi

  hf_log ERROR "no system chromium binary found; bake a browser into the image instead of downloading at runtime"
  return 1
}

require_search_tools() {
  local skill_name target_dir
  for skill_name in "${OPENCLAW_DDG_SKILL}" "${OPENCLAW_N2_SKILL}"; do
    ensure_prebuilt_skill "${skill_name}"
    target_dir="/root/.openclaw/workspace/skills/${skill_name}"
    if [[ -d "${target_dir}" ]]; then
      hf_log INFO "skill ${skill_name} already present at ${target_dir}"
    else
      hf_log WARN "skill ${skill_name} is missing at ${target_dir}; search skill loading will be reduced until you preseed it"
    fi
  done

  if has_tavily_python; then
    hf_log INFO "tavily-python already available in the image"
  else
    hf_log ERROR "tavily-python is missing; bake it into the image during Docker build"
    return 1
  fi

  if has_pillow; then
    hf_log INFO "Pillow already available in the image"
  else
    hf_log ERROR "Pillow is missing; bake it into the image during Docker build"
    return 1
  fi
}

hf_log INFO "running install-extra hook"

# 低风控模式：运行时不再联网安装插件、技能、Python 包或浏览器。
# HF 容器启动阶段只从镜像预置目录复制插件，并校验其他资产。

ensure_prebuilt_extension "wecom"
ensure_prebuilt_extension "wecom-app"
ensure_prebuilt_extension "openclaw-weixin"
require_agent_browser
require_search_tools

if [[ -x "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh" ]]; then
  hf_log INFO "executing persisted install hook"
  "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh"
else
  hf_log INFO "no persisted install hook found; skipping"
fi
