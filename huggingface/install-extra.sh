#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"
OPENCLAW_CHINA_PLUGIN_PACKAGE="${OPENCLAW_CHINA_PLUGIN_PACKAGE:-@openclaw-china/channels}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

hf_ensure_tree

# 检查统一中国渠道插件是否已经安装。
# 这里优先读取 `openclaw plugins list --json`，避免重复安装导致每次启动都走 npm。
has_openclaw_china_channels() {
  local plugins_json
  plugins_json="$(openclaw plugins list --json 2>/dev/null || true)"
  [[ -z "${plugins_json}" ]] && return 1

  node - <<'EOF' "${plugins_json}" "${OPENCLAW_CHINA_PLUGIN_PACKAGE}"
const pluginsJson = process.argv[2];
const targetPackage = process.argv[3];

let parsed;
try {
  parsed = JSON.parse(pluginsJson);
} catch {
  process.exit(1);
}

if (!Array.isArray(parsed)) {
  process.exit(1);
}

const found = parsed.some((entry) => {
  if (!entry || typeof entry !== "object") return false;
  const id = typeof entry.id === "string" ? entry.id : "";
  const packageName = typeof entry.packageName === "string" ? entry.packageName : "";
  const source = typeof entry.source === "string" ? entry.source : "";
  return id === "channels" || packageName === targetPackage || source.includes(targetPackage);
});

process.exit(found ? 0 : 1);
EOF
}

# 只做插件安装，不执行 china setup。
# 原因：HF Space 启动环境不支持交互式配置，China 渠道具体配置应提前写到 openclaw.json 或后续再单独补充。
install_openclaw_china_channels() {
  if has_openclaw_china_channels; then
    hf_log INFO "OpenClaw China channels plugin already installed; skipping"
    return 0
  fi

  hf_log INFO "installing OpenClaw China channels plugin: ${OPENCLAW_CHINA_PLUGIN_PACKAGE}"
  openclaw plugins install "${OPENCLAW_CHINA_PLUGIN_PACKAGE}"
}

hf_log INFO "running install-extra hook"

install_openclaw_china_channels

if [[ -x "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh" ]]; then
  hf_log INFO "executing persisted install hook"
  "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh"
else
  hf_log INFO "no persisted install hook found; skipping"
fi
