#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_DATA_ROOT="${OPENCLAW_HF_DATA_ROOT:-/data/openclaw}"
OPENCLAW_HF_LIVE_ROOT="${OPENCLAW_HF_LIVE_ROOT:-${OPENCLAW_HF_DATA_ROOT}/live/.openclaw}"
OPENCLAW_HF_SYNC_ROOT="${OPENCLAW_HF_SYNC_ROOT:-${OPENCLAW_HF_DATA_ROOT}/sync}"
OPENCLAW_HF_LOG_ROOT="${OPENCLAW_HF_LOG_ROOT:-${OPENCLAW_HF_DATA_ROOT}/logs}"
OPENCLAW_HF_INSTALL_ROOT="${OPENCLAW_HF_INSTALL_ROOT:-${OPENCLAW_HF_DATA_ROOT}/install}"
OPENCLAW_HF_RUNTIME_HOME="${OPENCLAW_HF_RUNTIME_HOME:-${HOME:-/root}}"
OPENCLAW_HF_RUNTIME_ROOT="${OPENCLAW_HF_RUNTIME_ROOT:-${OPENCLAW_HF_RUNTIME_HOME}/.openclaw}"
OPENCLAW_HF_STATE_LINK_MODE="${OPENCLAW_HF_STATE_LINK_MODE:-mixed}"
OPENCLAW_HF_SNAPSHOT_LIMIT="${OPENCLAW_HF_SNAPSHOT_LIMIT:-20}"
OPENCLAW_HF_MANIFEST_HASH_LIMIT_BYTES="${OPENCLAW_HF_MANIFEST_HASH_LIMIT_BYTES:-10485760}"
OPENCLAW_HF_CONFIG_CONFLICT_POLICY="${OPENCLAW_HF_CONFIG_CONFLICT_POLICY:-data_wins}"
OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY="${OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY:-data_wins}"
OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY="${OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY:-newer_wins}"

OPENCLAW_HF_LINKED_FILES=("openclaw.json" "auth-profiles.json")
OPENCLAW_HF_LINKED_DIRS=("credentials" "agents" "workspace" "skills")
OPENCLAW_HF_LOCAL_SYNC_DIRS=("cron" "media")

hf_log() {
  local level="$1"
  shift
  printf '[openclaw-hf][%s] %s\n' "$level" "$*"
}

hf_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

hf_now_compact() {
  date -u +%Y%m%dT%H%M%SZ
}

hf_join_by() {
  local delimiter="$1"
  shift || true
  local first=1
  local item
  for item in "$@"; do
    if (( first == 1 )); then
      printf '%s' "${item}"
      first=0
    else
      printf '%s%s' "${delimiter}" "${item}"
    fi
  done
}

hf_escape_json() {
  local value="$1"
  value=${value//\\/\\\\}
  value=${value//"/\\"}
  value=${value//$'\n'/\\n}
  value=${value//$'\r'/\\r}
  value=${value//$'\t'/\\t}
  printf '%s' "${value}"
}

hf_ensure_tree() {
  mkdir -p \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_SYNC_ROOT}/manifests" \
    "${OPENCLAW_HF_SYNC_ROOT}/locks" \
    "${OPENCLAW_HF_SYNC_ROOT}/queue" \
    "${OPENCLAW_HF_SYNC_ROOT}/snapshots" \
    "${OPENCLAW_HF_LOG_ROOT}/archive" \
    "${OPENCLAW_HF_LOG_ROOT}/syncd" \
    "${OPENCLAW_HF_LOG_ROOT}/startup" \
    "${OPENCLAW_HF_INSTALL_ROOT}/plugins" \
    "${OPENCLAW_HF_INSTALL_ROOT}/skills" \
    "${OPENCLAW_HF_INSTALL_ROOT}/bootstrap" \
    "${OPENCLAW_HF_RUNTIME_ROOT}"
}

hf_relative_path() {
  local full_path="$1"
  local root_path="$2"
  local resolved_full
  local resolved_root
  resolved_full="$(realpath -m "${full_path}")"
  resolved_root="$(realpath -m "${root_path}")"
  if [[ "${resolved_full}" == "${resolved_root}" ]]; then
    printf '.'
    return 0
  fi
  printf '%s' "${resolved_full#${resolved_root}/}"
}

hf_snapshot_path_if_exists() {
  local source_path="$1"
  local label="$2"
  if [[ ! -e "${source_path}" ]]; then
    return 0
  fi
  local stamp
  stamp="$(hf_now_compact)"
  local target_dir="${OPENCLAW_HF_SYNC_ROOT}/snapshots/${label}"
  mkdir -p "${target_dir}"
  local base_name
  base_name="$(basename "${source_path}")"
  if [[ -d "${source_path}" && ! -L "${source_path}" ]]; then
    cp -a "${source_path}" "${target_dir}/${base_name}.${stamp}.bak"
  else
    cp -a "${source_path}" "${target_dir}/${base_name}.${stamp}.bak"
  fi
}

hf_paths_differ() {
  local left_path="$1"
  local right_path="$2"
  if [[ ! -e "${left_path}" || ! -e "${right_path}" ]]; then
    return 1
  fi
  if [[ -d "${left_path}" && -d "${right_path}" && ! -L "${left_path}" && ! -L "${right_path}" ]]; then
    if diff -qr "${left_path}" "${right_path}" >/dev/null 2>&1; then
      return 1
    fi
    return 0
  fi
  if cmp -s "${left_path}" "${right_path}" 2>/dev/null; then
    return 1
  fi
  return 0
}

hf_snapshot_conflict_pair() {
  local runtime_path="$1"
  local live_path="$2"
  local label="$3"
  local target_dir="${OPENCLAW_HF_SYNC_ROOT}/snapshots/${label}/$(hf_now_compact)"
  mkdir -p "${target_dir}"
  if [[ -e "${runtime_path}" ]]; then
    cp -a "${runtime_path}" "${target_dir}/runtime-$(basename "${runtime_path}")"
  fi
  if [[ -e "${live_path}" ]]; then
    cp -a "${live_path}" "${target_dir}/live-$(basename "${live_path}")"
  fi
  hf_trim_snapshot_dir "${OPENCLAW_HF_SYNC_ROOT}/snapshots/${label}"
}

hf_trim_snapshot_dir() {
  local target_dir="$1"
  if [[ ! -d "${target_dir}" ]]; then
    return 0
  fi
  local excess
  excess=$(find "${target_dir}" -mindepth 1 -maxdepth 1 | wc -l)
  if (( excess <= OPENCLAW_HF_SNAPSHOT_LIMIT )); then
    return 0
  fi
  find "${target_dir}" -mindepth 1 -maxdepth 1 -printf '%T@ %p\n' | sort -n | head -n $((excess - OPENCLAW_HF_SNAPSHOT_LIMIT)) | while read -r _old path_name; do
    rm -rf "${path_name}"
  done
}

hf_acquire_lock() {
  local name="$1"
  local lock_dir="${OPENCLAW_HF_SYNC_ROOT}/locks/${name}.lock"
  local waited=0
  while ! mkdir "${lock_dir}" 2>/dev/null; do
    local pid_file start_file command_file held_pid held_start held_command current_start current_command
    pid_file="${lock_dir}/pid"
    start_file="${lock_dir}/starttime"
    command_file="${lock_dir}/command"
    held_pid=""
    held_start=""
    held_command=""
    if [[ -f "${pid_file}" ]]; then
      held_pid="$(tr -d '[:space:]' < "${pid_file}" 2>/dev/null || true)"
    fi
    if [[ -f "${start_file}" ]]; then
      held_start="$(tr -d '[:space:]' < "${start_file}" 2>/dev/null || true)"
    fi
    if [[ -f "${command_file}" ]]; then
      held_command="$(cat "${command_file}" 2>/dev/null || true)"
    fi

    if [[ -z "${held_pid}" || -z "${held_start}" || -z "${held_command}" ]]; then
      hf_log WARN "reaping stale lock ${name} with incomplete metadata"
      rm -rf "${lock_dir}"
      continue
    fi

    if ! kill -0 "${held_pid}" 2>/dev/null; then
      hf_log WARN "reaping stale lock ${name} held by dead pid ${held_pid}"
      rm -rf "${lock_dir}"
      continue
    fi

    current_start="$(awk '{print $22}' "/proc/${held_pid}/stat" 2>/dev/null || true)"
    current_command="$(tr '\0' ' ' < "/proc/${held_pid}/cmdline" 2>/dev/null || true)"

    if [[ -z "${current_start}" || "${current_start}" != "${held_start}" ]]; then
      hf_log WARN "reaping stale lock ${name} held by recycled pid ${held_pid}"
      rm -rf "${lock_dir}"
      continue
    fi

    if [[ "${current_command}" != *"openclaw-hf"* && "${current_command}" != *"start-hf.sh"* && "${current_command}" != *"syncd.sh"* && "${current_command}" != *"hf-sync.sh"* ]]; then
      hf_log WARN "reaping stale lock ${name} held by unrelated pid ${held_pid}"
      rm -rf "${lock_dir}"
      continue
    fi

    waited=$((waited + 1))
    if (( waited > 120 )); then
      hf_log ERROR "timed out waiting for lock ${name}"
      return 1
    fi
    sleep 1
  done
  printf '%s\n' "$$" > "${lock_dir}/pid"
  awk '{print $22}' "/proc/$$/stat" > "${lock_dir}/starttime"
  tr '\0' ' ' < "/proc/$$/cmdline" > "${lock_dir}/command"
}

hf_release_lock() {
  local name="$1"
  rm -rf "${OPENCLAW_HF_SYNC_ROOT}/locks/${name}.lock"
}

hf_rsync_dir() {
  local source_dir="$1"
  local target_dir="$2"
  mkdir -p "${target_dir}"
  rsync -a --delete --safe-links "${source_dir}/" "${target_dir}/"
}

hf_rsync_dir_no_delete() {
  local source_dir="$1"
  local target_dir="$2"
  mkdir -p "${target_dir}"
  rsync -a --safe-links "${source_dir}/" "${target_dir}/"
}

hf_sync_file_if_newer() {
  local preferred="$1"
  local fallback="$2"
  local preferred_real fallback_real
  preferred_real="$(realpath -m "${preferred}")"
  fallback_real="$(realpath -m "${fallback}")"
  if [[ "${preferred_real}" == "${fallback_real}" ]]; then
    return 0
  fi
  if [[ -f "${preferred}" && -f "${fallback}" ]]; then
    if [[ "${preferred}" -nt "${fallback}" ]]; then
      cp -f "${preferred}" "${fallback}"
    elif [[ "${fallback}" -nt "${preferred}" ]]; then
      cp -f "${fallback}" "${preferred}"
    fi
    return 0
  fi
  if [[ -f "${preferred}" && ! -f "${fallback}" ]]; then
    mkdir -p "$(dirname "${fallback}")"
    cp -f "${preferred}" "${fallback}"
    return 0
  fi
  if [[ -f "${fallback}" && ! -f "${preferred}" ]]; then
    mkdir -p "$(dirname "${preferred}")"
    cp -f "${fallback}" "${preferred}"
  fi
}

hf_hash_file_if_small() {
  local file_path="$1"
  local file_size="$2"
  if (( file_size > OPENCLAW_HF_MANIFEST_HASH_LIMIT_BYTES )); then
    printf ''
    return 0
  fi
  sha256sum "${file_path}" | awk '{print $1}'
}

hf_manifest_for_path() {
  local root_path="$1"
  if [[ ! -e "${root_path}" ]]; then
    printf '[]'
    return 0
  fi

  local entries=()
  local item
  while IFS= read -r item; do
    [[ -z "${item}" ]] && continue
    if [[ -d "${item}" && ! -L "${item}" ]]; then
      continue
    fi
    local rel_path
    rel_path="$(hf_relative_path "${item}" "${root_path}")"
    local entry_type="file"
    local item_size=0
    if [[ -L "${item}" ]]; then
      entry_type="symlink"
    fi
    if [[ -f "${item}" ]]; then
      item_size=$(stat -c '%s' "${item}")
    fi
    local item_mtime
    item_mtime=$(stat -c '%Y' "${item}")
    local hash_value=""
    if [[ "${entry_type}" == "file" ]]; then
      hash_value="$(hf_hash_file_if_small "${item}" "${item_size}")"
    fi
    entries+=("{\"path\":\"$(hf_escape_json "${rel_path}")\",\"type\":\"${entry_type}\",\"size\":${item_size},\"mtime\":${item_mtime},\"sha256\":\"${hash_value}\"}")
  done < <(find "${root_path}" \( -type f -o -type l \) | sort)

  if (( ${#entries[@]} == 0 )); then
    printf '[]'
    return 0
  fi

  printf '[%s]' "$(hf_join_by ',' "${entries[@]}")"
}

hf_write_manifest() {
  local name="$1"
  local status="$2"
  local detail="$3"
  shift 3
  local target="${OPENCLAW_HF_SYNC_ROOT}/manifests/${name}.json"
  local sections=()
  local section_path
  for section_path in "$@"; do
    [[ -z "${section_path}" ]] && continue
    local section_name
    section_name="$(basename "${section_path}")"
    sections+=("{\"root\":\"$(hf_escape_json "${section_path}")\",\"name\":\"$(hf_escape_json "${section_name}")\",\"entries\":$(hf_manifest_for_path "${section_path}")}")
  done
  cat > "${target}" <<EOF
{
  "name": "$(hf_escape_json "${name}")",
  "status": "$(hf_escape_json "${status}")",
  "detail": "$(hf_escape_json "${detail}")",
  "updatedAt": "$(hf_now)",
  "stateLinkMode": "$(hf_escape_json "${OPENCLAW_HF_STATE_LINK_MODE}")",
  "sections": [$(hf_join_by ',' "${sections[@]}")]
}
EOF
}

hf_queue_set() {
  local value="$1"
  printf '%s\n' "${value}" > "${OPENCLAW_HF_SYNC_ROOT}/queue/current-tier"
}

hf_queue_get() {
  if [[ -f "${OPENCLAW_HF_SYNC_ROOT}/queue/current-tier" ]]; then
    cat "${OPENCLAW_HF_SYNC_ROOT}/queue/current-tier"
    return 0
  fi
  printf 'tier1\n'
}

hf_runtime_path() {
  local subpath="$1"
  printf '%s/%s' "${OPENCLAW_HF_RUNTIME_ROOT}" "${subpath}"
}

hf_live_path() {
  local subpath="$1"
  printf '%s/%s' "${OPENCLAW_HF_LIVE_ROOT}" "${subpath}"
}

hf_prepare_runtime_dir() {
  local subpath="$1"
  mkdir -p "$(hf_runtime_path "${subpath}")"
  mkdir -p "$(hf_live_path "${subpath}")"
}

hf_link_path() {
  local runtime_path="$1"
  local live_path="$2"
  mkdir -p "$(dirname "${runtime_path}")" "$(dirname "${live_path}")"
  if [[ -L "${runtime_path}" ]]; then
    local existing_target
    existing_target="$(readlink "${runtime_path}")"
    if [[ "${existing_target}" == "${live_path}" ]]; then
      return 0
    fi
    rm -f "${runtime_path}"
  elif [[ -e "${runtime_path}" ]]; then
    hf_snapshot_path_if_exists "${runtime_path}" pre-link
    rm -rf "${runtime_path}"
  fi
  ln -s "${live_path}" "${runtime_path}"
}

hf_materialize_live_file() {
  local runtime_file="$1"
  local live_file="$2"
  mkdir -p "$(dirname "${runtime_file}")" "$(dirname "${live_file}")"
  if [[ "$(realpath -m "${runtime_file}")" == "$(realpath -m "${live_file}")" ]]; then
    return 0
  fi
  if [[ -f "${runtime_file}" && ! -e "${live_file}" ]]; then
    cp -f "${runtime_file}" "${live_file}"
  elif [[ -f "${runtime_file}" && -f "${live_file}" ]]; then
    if hf_paths_differ "${runtime_file}" "${live_file}"; then
      hf_snapshot_conflict_pair "${runtime_file}" "${live_file}" config-conflict
    fi
    case "${OPENCLAW_HF_CONFIG_CONFLICT_POLICY}" in
      runtime_wins)
        cp -f "${runtime_file}" "${live_file}"
        ;;
      newer_wins)
        hf_sync_file_if_newer "${live_file}" "${runtime_file}"
        hf_sync_file_if_newer "${runtime_file}" "${live_file}"
        ;;
      *)
        cp -f "${live_file}" "${runtime_file}"
        ;;
    esac
  elif [[ -f "${live_file}" && ! -e "${runtime_file}" ]]; then
    cp -f "${live_file}" "${runtime_file}"
  fi
}

hf_materialize_live_dir() {
  local runtime_dir="$1"
  local live_dir="$2"
  mkdir -p "${live_dir}"
  if [[ -d "${runtime_dir}" && ! -L "${runtime_dir}" && ! -d "${live_dir}" ]]; then
    hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
    return 0
  fi
  mkdir -p "${runtime_dir}"
  if [[ -d "${runtime_dir}" && ! -L "${runtime_dir}" && -d "${live_dir}" ]]; then
    if hf_paths_differ "${runtime_dir}" "${live_dir}"; then
      hf_snapshot_conflict_pair "${runtime_dir}" "${live_dir}" strong-dir-conflict
    fi
    case "${OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY}" in
      runtime_wins)
        hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
        ;;
      newer_wins)
        hf_rsync_dir_no_delete "${live_dir}" "${runtime_dir}"
        hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
        ;;
      *)
        hf_rsync_dir_no_delete "${live_dir}" "${runtime_dir}"
        ;;
    esac
  fi
}

hf_prepare_linked_state() {
  local file_name
  for file_name in "${OPENCLAW_HF_LINKED_FILES[@]}"; do
    local runtime_file live_file
    runtime_file="$(hf_runtime_path "${file_name}")"
    live_file="$(hf_live_path "${file_name}")"
    hf_materialize_live_file "${runtime_file}" "${live_file}"
    if [[ "${OPENCLAW_HF_STATE_LINK_MODE}" != "copy" ]]; then
      hf_link_path "${runtime_file}" "${live_file}"
    fi
  done

  local dir_name
  for dir_name in "${OPENCLAW_HF_LINKED_DIRS[@]}"; do
    local runtime_dir live_dir
    runtime_dir="$(hf_runtime_path "${dir_name}")"
    live_dir="$(hf_live_path "${dir_name}")"
    hf_materialize_live_dir "${runtime_dir}" "${live_dir}"
    if [[ "${OPENCLAW_HF_STATE_LINK_MODE}" != "copy" ]]; then
      hf_link_path "${runtime_dir}" "${live_dir}"
    else
      mkdir -p "${runtime_dir}"
      hf_rsync_dir_no_delete "${live_dir}" "${runtime_dir}"
    fi
  done
}

hf_restore_local_sync_dir() {
  local dir_name="$1"
  local runtime_dir live_dir
  runtime_dir="$(hf_runtime_path "${dir_name}")"
  live_dir="$(hf_live_path "${dir_name}")"
  mkdir -p "${runtime_dir}" "${live_dir}"
  if hf_paths_differ "${runtime_dir}" "${live_dir}"; then
    hf_snapshot_conflict_pair "${runtime_dir}" "${live_dir}" local-sync-restore
  fi
  case "${OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY}" in
    runtime_wins)
      hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
      ;;
    data_wins)
      hf_rsync_dir_no_delete "${live_dir}" "${runtime_dir}"
      ;;
    *)
      hf_rsync_dir_no_delete "${live_dir}" "${runtime_dir}"
      hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
      ;;
  esac
}

hf_sync_linked_state_to_live() {
  local dir_name
  for dir_name in "${OPENCLAW_HF_LINKED_DIRS[@]}"; do
    local live_dir runtime_dir
    live_dir="$(hf_live_path "${dir_name}")"
    runtime_dir="$(hf_runtime_path "${dir_name}")"
    if [[ "${OPENCLAW_HF_STATE_LINK_MODE}" == "copy" ]]; then
      hf_rsync_dir "${runtime_dir}" "${live_dir}"
    fi
  done
  local file_name
  for file_name in "${OPENCLAW_HF_LINKED_FILES[@]}"; do
    local live_file runtime_file
    live_file="$(hf_live_path "${file_name}")"
    runtime_file="$(hf_runtime_path "${file_name}")"
    if [[ -f "${runtime_file}" ]]; then
      cp -f "${runtime_file}" "${live_file}"
    fi
  done
}

hf_archive_tmp_logs() {
  if [[ -d /tmp/openclaw ]]; then
    local archive_dir
    archive_dir="${OPENCLAW_HF_LOG_ROOT}/archive/$(date -u +%Y%m%d)"
    mkdir -p "${archive_dir}"
    rsync -a --safe-links /tmp/openclaw/ "${archive_dir}/"
    hf_trim_snapshot_dir "${OPENCLAW_HF_LOG_ROOT}/archive"
  fi
}

hf_sync_install_assets() {
  if [[ -d "${OPENCLAW_HF_RUNTIME_ROOT}/skills" && ! -L "${OPENCLAW_HF_RUNTIME_ROOT}/skills" ]]; then
    hf_rsync_dir_no_delete "${OPENCLAW_HF_RUNTIME_ROOT}/skills" "${OPENCLAW_HF_INSTALL_ROOT}/skills/runtime-skills"
  fi
}

hf_sync_local_sync_dir() {
  local dir_name="$1"
  local runtime_dir live_dir
  runtime_dir="$(hf_runtime_path "${dir_name}")"
  live_dir="$(hf_live_path "${dir_name}")"
  mkdir -p "${runtime_dir}" "${live_dir}"
  hf_rsync_dir_no_delete "${runtime_dir}" "${live_dir}"
}

hf_build_state_summary() {
  cat <<EOF
runtimeRoot=$(hf_escape_json "${OPENCLAW_HF_RUNTIME_ROOT}")
liveRoot=$(hf_escape_json "${OPENCLAW_HF_LIVE_ROOT}")
linkMode=$(hf_escape_json "${OPENCLAW_HF_STATE_LINK_MODE}")
configConflictPolicy=$(hf_escape_json "${OPENCLAW_HF_CONFIG_CONFLICT_POLICY}")
strongDirRestorePolicy=$(hf_escape_json "${OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY}")
localSyncRestorePolicy=$(hf_escape_json "${OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY}")
linkedFiles=$(hf_escape_json "$(hf_join_by ',' "${OPENCLAW_HF_LINKED_FILES[@]}")")
linkedDirs=$(hf_escape_json "$(hf_join_by ',' "${OPENCLAW_HF_LINKED_DIRS[@]}")")
localSyncDirs=$(hf_escape_json "$(hf_join_by ',' "${OPENCLAW_HF_LOCAL_SYNC_DIRS[@]}")")
EOF
}
