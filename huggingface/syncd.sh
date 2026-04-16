#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

SYNC_LOG_FILE="${OPENCLAW_HF_LOG_ROOT}/syncd/syncd.log"

log_syncd() {
  local level="$1"
  shift
  local line
  line="$(hf_now) [${level}] $*"
  printf '%s\n' "${line}" | tee -a "${SYNC_LOG_FILE}" >/dev/null
}

sync_tier1() {
  hf_acquire_lock sync
  hf_sync_linked_state_to_live
  hf_write_manifest tier1 ok "synced linked config, credentials, agents, workspace, and skills" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "$(hf_live_path agents)" \
    "$(hf_live_path workspace)" \
    "$(hf_live_path skills)"
  hf_release_lock sync
}

sync_tier2() {
  hf_acquire_lock sync
  hf_sync_local_sync_dir cron
  hf_sync_local_sync_dir extensions
  hf_write_manifest tier2 ok "synced cron, extensions, and medium-priority runtime state" \
    "$(hf_runtime_path cron)" \
    "$(hf_live_path cron)" \
    "$(hf_runtime_path extensions)" \
    "$(hf_live_path extensions)"
  hf_release_lock sync
}

sync_tier3() {
  hf_acquire_lock sync
  hf_sync_local_sync_dir media
  hf_write_manifest tier3 ok "synced media and weak-persistence assets" \
    "$(hf_runtime_path media)" \
    "$(hf_live_path media)"
  hf_release_lock sync
}

sync_tier4() {
  hf_acquire_lock flush
  hf_archive_tmp_logs
  hf_write_manifest tier4 ok "archived temporary logs and flush-time diagnostics" \
    "${OPENCLAW_HF_LOG_ROOT}/archive"
  hf_release_lock flush
}

sync_install_assets() {
  hf_acquire_lock sync
  hf_sync_install_assets
  hf_write_manifest install-assets ok "captured install and skill bootstrap assets" \
    "${OPENCLAW_HF_INSTALL_ROOT}"
  hf_release_lock sync
}

final_flush() {
  log_syncd INFO "running final flush"
  sync_tier1 || true
  sync_tier2 || true
  sync_tier3 || true
  sync_install_assets || true
  sync_tier4 || true
}

trap 'final_flush; exit 0' TERM INT

hf_ensure_tree
touch "${SYNC_LOG_FILE}"

log_syncd INFO "sync daemon started"
log_syncd INFO "runtime root=${OPENCLAW_HF_RUNTIME_ROOT} live root=${OPENCLAW_HF_LIVE_ROOT}"

while true; do
  current_tier="$(hf_queue_get)"
  case "${current_tier}" in
    tier1)
      log_syncd INFO "syncing tier1"
      sync_tier1
      sync_install_assets
      hf_queue_set tier2
      sleep 60
      ;;
    tier2)
      log_syncd INFO "syncing tier2"
      sync_tier2
      hf_queue_set tier3
      sleep 120
      ;;
    tier3)
      log_syncd INFO "syncing tier3"
      sync_tier3
      hf_queue_set tier4
      sleep 300
      ;;
    *)
      log_syncd INFO "syncing tier4"
      sync_tier4
      hf_queue_set tier1
      sleep 1800
      ;;
  esac
done
