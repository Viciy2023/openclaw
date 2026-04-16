#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

SYNC_PID=""
GATEWAY_PID=""
STARTUP_LOG_FILE=""

startup_log() {
  local level="$1"
  shift
  local line
  line="$(hf_now) [${level}] $*"
  printf '%s\n' "${line}"
  if [[ -n "${STARTUP_LOG_FILE}" ]]; then
    printf '%s\n' "${line}" >> "${STARTUP_LOG_FILE}"
  fi
}

write_runtime_manifests() {
  hf_write_manifest runtime-startup ok "runtime state after startup restore" \
    "${OPENCLAW_HF_RUNTIME_ROOT}" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_INSTALL_ROOT}"
}

restore_runtime_state() {
  startup_log INFO "restoring runtime state"
  hf_acquire_lock startup

  hf_snapshot_path_if_exists "${OPENCLAW_HF_RUNTIME_ROOT}" startup-runtime-root

  hf_prepare_linked_state

  local dir_name
  for dir_name in "${OPENCLAW_HF_LOCAL_SYNC_DIRS[@]}"; do
    hf_restore_local_sync_dir "${dir_name}"
  done

  hf_write_manifest startup ok "restored linked and local-sync OpenClaw state into runtime root" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_RUNTIME_ROOT}"

  cat > "${OPENCLAW_HF_SYNC_ROOT}/queue/restore-summary.txt" <<EOF
restoredAt=$(hf_now)
$(hf_build_state_summary)
EOF

  write_runtime_manifests

  hf_release_lock startup
}

start_syncd() {
  if [[ "${OPENCLAW_HF_SYNC_ENABLED:-1}" != "1" ]]; then
    startup_log INFO "sync daemon disabled"
    return 0
  fi
  startup_log INFO "starting sync daemon"
  "${OPENCLAW_HF_APP_DIR}/syncd.sh" &
  SYNC_PID="$!"
}

run_gateway() {
  local gateway_port gateway_bind
  gateway_port="${OPENCLAW_HF_GATEWAY_PORT:-18789}"
  gateway_bind="${OPENCLAW_HF_GATEWAY_BIND:-lan}"

  startup_log INFO "starting OpenClaw gateway as root-global install"

  if [[ -n "${OPENCLAW_HF_GATEWAY_EXTRA_ARGS:-}" ]]; then
    # shellcheck disable=SC2086
    openclaw gateway run --bind "${gateway_bind}" --port "${gateway_port}" --allow-unconfigured ${OPENCLAW_HF_GATEWAY_EXTRA_ARGS} &
    GATEWAY_PID="$!"
    wait "${GATEWAY_PID}"
    return $?
  fi

  openclaw gateway run --bind "${gateway_bind}" --port "${gateway_port}" --allow-unconfigured &
  GATEWAY_PID="$!"
  wait "${GATEWAY_PID}"
}

shutdown() {
  local exit_code=$?
  startup_log INFO "gateway wrapper shutting down"
  if [[ -n "${GATEWAY_PID}" ]] && kill -0 "${GATEWAY_PID}" 2>/dev/null; then
    kill -TERM "${GATEWAY_PID}" 2>/dev/null || true
    wait "${GATEWAY_PID}" 2>/dev/null || true
  fi
  if [[ -n "${SYNC_PID}" ]] && kill -0 "${SYNC_PID}" 2>/dev/null; then
    kill -TERM "${SYNC_PID}" 2>/dev/null || true
    wait "${SYNC_PID}" 2>/dev/null || true
  fi
  exit "${exit_code}"
}

trap shutdown EXIT TERM INT

hf_ensure_tree
STARTUP_LOG_FILE="${OPENCLAW_HF_LOG_ROOT}/startup/start-hf.log"
touch "${STARTUP_LOG_FILE}"

startup_log INFO "wrapper initialized"
startup_log INFO "runtime root: ${OPENCLAW_HF_RUNTIME_ROOT}"
startup_log INFO "live root: ${OPENCLAW_HF_LIVE_ROOT}"
startup_log INFO "state link mode: ${OPENCLAW_HF_STATE_LINK_MODE}"

"${OPENCLAW_HF_APP_DIR}/install-extra.sh"
restore_runtime_state
start_syncd
run_gateway
