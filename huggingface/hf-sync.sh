#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"
OPENCLAW_HF_BUCKET_ENV_FILE="${OPENCLAW_HF_BUCKET_ENV_FILE:-/data/.env}"

hf_load_bucket_env_file() {
  local env_file="$1"
  local source_status=0

  if [[ ! -f "${env_file}" ]]; then
    return 0
  fi

  if [[ ! -r "${env_file}" ]]; then
    printf 'bucket env file is not readable: %s\n' "${env_file}" >&2
    return 1
  fi

  set +e
  set -a
  # shellcheck disable=SC1090
  . "${env_file}"
  source_status=$?
  set +a
  set -e

  if (( source_status != 0 )); then
    printf 'failed to load bucket env file: %s\n' "${env_file}" >&2
    return "${source_status}"
  fi
}

hf_load_bucket_env_file "${OPENCLAW_HF_BUCKET_ENV_FILE}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

cmd_status() {
  hf_ensure_tree
  printf 'runtimeRoot=%s\n' "${OPENCLAW_HF_RUNTIME_ROOT}"
  printf 'liveRoot=%s\n' "${OPENCLAW_HF_LIVE_ROOT}"
  printf 'queueTier=%s\n' "$(hf_queue_get)"
  printf 'stateLinkMode=%s\n' "${OPENCLAW_HF_STATE_LINK_MODE}"
  printf 'textToImageModelSet=%s\n' "${OPENCLAW_TEXT_TO_IMAGE_MODEL_SET:-FIRST}"
  printf 'manifests:\n'
  find "${OPENCLAW_HF_SYNC_ROOT}/manifests" -maxdepth 1 -type f -name '*.json' | sort
}

cmd_restore() {
  hf_ensure_tree
  hf_acquire_lock manual-restore
  hf_prepare_linked_state
  local dir_name
  for dir_name in "${OPENCLAW_HF_LOCAL_SYNC_DIRS[@]}"; do
    hf_restore_local_sync_dir "${dir_name}"
  done
  hf_write_manifest manual-restore ok "manual restore completed" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_RUNTIME_ROOT}"
  hf_release_lock manual-restore
}

cmd_flush() {
  hf_ensure_tree
  hf_acquire_lock manual-flush
  hf_sync_linked_state_to_live
  local dir_name
  for dir_name in "${OPENCLAW_HF_LOCAL_SYNC_DIRS[@]}"; do
    hf_sync_local_sync_dir "${dir_name}"
  done
  hf_sync_install_assets
  hf_archive_tmp_logs
  hf_write_manifest manual-flush ok "manual flush completed" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_INSTALL_ROOT}" \
    "${OPENCLAW_HF_LOG_ROOT}/archive"
  hf_release_lock manual-flush
}

cmd_manifest() {
  local manifest_name="${1:-}"
  if [[ -z "${manifest_name}" ]]; then
    find "${OPENCLAW_HF_SYNC_ROOT}/manifests" -maxdepth 1 -type f -name '*.json' | sort
    return 0
  fi
  local target="${OPENCLAW_HF_SYNC_ROOT}/manifests/${manifest_name}.json"
  if [[ ! -f "${target}" ]]; then
    printf 'manifest not found: %s\n' "${manifest_name}" >&2
    return 1
  fi
  cat "${target}"
}

usage() {
  cat <<EOF
Usage: hf-sync.sh <command>

Commands:
  status           Show runtime roots, tier queue, and manifest files
  restore          Restore strong and local-sync state from durable storage
  flush            Push current runtime state back into durable storage
  manifest [name]  List manifests or print one manifest by name
EOF
}

main() {
  local command="${1:-}"
  shift || true
  case "${command}" in
    status) cmd_status "$@" ;;
    restore) cmd_restore "$@" ;;
    flush) cmd_flush "$@" ;;
    manifest) cmd_manifest "$@" ;;
    *)
      usage
      [[ -z "${command}" ]] && return 0
      return 1
      ;;
  esac
}

main "$@"
