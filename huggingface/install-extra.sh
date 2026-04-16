#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

hf_ensure_tree

hf_log INFO "running install-extra hook"

if [[ -x "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh" ]]; then
  hf_log INFO "executing persisted install hook"
  "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap/install-extra.local.sh"
else
  hf_log INFO "no persisted install hook found; skipping"
fi
