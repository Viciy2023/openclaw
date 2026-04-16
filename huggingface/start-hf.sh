#!/usr/bin/env bash

set -euo pipefail

OPENCLAW_HF_APP_DIR="${OPENCLAW_HF_APP_DIR:-/opt/openclaw-hf}"

. "${OPENCLAW_HF_APP_DIR}/lib/common.sh"

SYNC_PID=""
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

print_outbound_ip() {
  local current_ip
  current_ip="$(curl -s --max-time 10 https://ifconfig.me || curl -s --max-time 10 https://api.ipify.org || echo "unknown")"

  printf '\n'
  printf '════════════════════════════════════════════════════════════════\n'
  printf '🌐 HF Space Outbound IP: %s\n' "${current_ip}"
  printf '════════════════════════════════════════════════════════════════\n'
  printf '\n'

  startup_log INFO "HF Space outbound IP: ${current_ip}"
}

write_runtime_manifests() {
  hf_write_manifest runtime-startup ok "runtime state after startup restore" \
    "${OPENCLAW_HF_RUNTIME_ROOT}" \
    "${OPENCLAW_HF_LIVE_ROOT}" \
    "${OPENCLAW_HF_INSTALL_ROOT}"
}

seed_hf_gateway_config() {
  local config_path
  config_path="${OPENCLAW_HF_RUNTIME_ROOT}/openclaw.json"
  mkdir -p "$(dirname "${config_path}")"

  if [[ ! -f "${config_path}" ]]; then
    cat > "${config_path}" <<'EOF'
{
  "gateway": {
    "mode": "local",
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true
    }
  }
}
EOF
    startup_log INFO "seeded new HF gateway config at ${config_path}"
    return 0
  fi

  node - <<'EOF' "${config_path}"
const fs = require("node:fs");

const configPath = process.argv[2];
const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);

if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
  throw new Error("openclaw.json root must be an object");
}

parsed.gateway = typeof parsed.gateway === "object" && parsed.gateway !== null && !Array.isArray(parsed.gateway)
  ? parsed.gateway
  : {};

if (parsed.gateway.mode == null) {
  parsed.gateway.mode = "local";
}

parsed.gateway.controlUi =
  typeof parsed.gateway.controlUi === "object" && parsed.gateway.controlUi !== null && !Array.isArray(parsed.gateway.controlUi)
    ? parsed.gateway.controlUi
    : {};

if (parsed.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback !== true) {
  parsed.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback = true;
}

fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
EOF

  startup_log INFO "ensured HF gateway control UI fallback config in ${config_path}"
}

resolve_primary_model_slot() {
  local raw_slot
  raw_slot="${OPENCLAW_PRIMARY_MODEL_SET:-FIRST}"
  raw_slot="$(printf '%s' "${raw_slot}" | tr '[:lower:]' '[:upper:]')"
  case "${raw_slot}" in
    1|FIRST)
      printf 'FIRST\n'
      ;;
    2|SECOND)
      printf 'SECOND\n'
      ;;
    3|THIRD)
      printf 'THIRD\n'
      ;;
    4|FOURTH)
      printf 'FOURTH\n'
      ;;
    *)
      startup_log ERROR "invalid OPENCLAW_PRIMARY_MODEL_SET=${raw_slot}; expected FIRST/SECOND/THIRD/FOURTH or 1/2/3/4"
      return 1
      ;;
  esac
}

seed_hf_model_config() {
  local config_path selected_slot
  config_path="${OPENCLAW_HF_RUNTIME_ROOT}/openclaw.json"
  selected_slot="$(resolve_primary_model_slot)"

  local primary_url_var primary_key_var primary_model_var
  primary_url_var="OPENCLAW_${selected_slot}_URL"
  primary_key_var="OPENCLAW_${selected_slot}_KEY"
  primary_model_var="OPENCLAW_${selected_slot}_MODEL"

  local primary_url primary_key primary_model
  primary_url="${!primary_url_var:-}"
  primary_key="${!primary_key_var:-}"
  primary_model="${!primary_model_var:-}"

  if [[ -z "${primary_url}" || -z "${primary_key}" || -z "${primary_model}" ]]; then
    startup_log ERROR "selected primary model set ${selected_slot} is incomplete; expected ${primary_url_var}, ${primary_key_var}, ${primary_model_var}"
    return 1
  fi

  local text_to_image_url text_to_image_key text_to_image_model
  local image_to_image_url image_to_image_key image_to_image_model
  local image_to_video_url image_to_video_key image_to_video_model

  text_to_image_url="${OPENCLAW_TEXT_TO_IMAGE_URL:-}"
  text_to_image_key="${OPENCLAW_TEXT_TO_IMAGE_KEY:-}"
  text_to_image_model="${OPENCLAW_TEXT_TO_IMAGE_MODEL:-}"

  image_to_image_url="${OPENCLAW_IMAGE_TO_IMAGE_URL:-}"
  image_to_image_key="${OPENCLAW_IMAGE_TO_IMAGE_KEY:-}"
  image_to_image_model="${OPENCLAW_IMAGE_TO_IMAGE_MODEL:-}"

  image_to_video_url="${OPENCLAW_IMAGE_TO_VIDEO_URL:-}"
  image_to_video_key="${OPENCLAW_IMAGE_TO_VIDEO_KEY:-}"
  image_to_video_model="${OPENCLAW_IMAGE_TO_VIDEO_MODEL:-}"

  node - <<'EOF' "${config_path}" "${primary_url}" "${primary_key}" "${primary_model}" "${selected_slot}" "${text_to_image_url}" "${text_to_image_key}" "${text_to_image_model}" "${image_to_image_url}" "${image_to_image_key}" "${image_to_image_model}" "${image_to_video_url}" "${image_to_video_key}" "${image_to_video_model}"
const fs = require("node:fs");

const [
  configPath,
  primaryUrl,
  primaryKey,
  primaryModel,
  selectedSlot,
  textToImageUrl,
  textToImageKey,
  textToImageModel,
  imageToImageUrl,
  imageToImageKey,
  imageToImageModel,
  imageToVideoUrl,
  imageToVideoKey,
  imageToVideoModel,
] = process.argv.slice(2);

const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);

const ensureObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

parsed.models = ensureObject(parsed.models);
parsed.models.mode = parsed.models.mode ?? "merge";
parsed.models.providers = ensureObject(parsed.models.providers);

parsed.models.providers["hf-openai"] = {
  api: "openai-completions",
  auth: "api-key",
  baseUrl: primaryUrl,
  apiKey: primaryKey,
  models: [
    { id: primaryModel, name: `HF Primary ${selectedSlot}` },
    ...(textToImageModel ? [{ id: textToImageModel, name: "HF Text To Image" }] : []),
    ...(imageToImageModel ? [{ id: imageToImageModel, name: "HF Image To Image" }] : []),
    ...(imageToVideoModel ? [{ id: imageToVideoModel, name: "HF Image To Video" }] : []),
  ],
};

parsed.agents = ensureObject(parsed.agents);
parsed.agents.defaults = ensureObject(parsed.agents.defaults);
parsed.agents.defaults.model = { primary: `hf-openai/${primaryModel}` };

if (textToImageModel) {
  parsed.agents.defaults.imageGenerationModel = { primary: `hf-openai/${textToImageModel}` };
}

if (imageToVideoModel) {
  parsed.agents.defaults.videoGenerationModel = { primary: `hf-openai/${imageToVideoModel}` };
}

parsed.env = ensureObject(parsed.env);
parsed.env.vars = ensureObject(parsed.env.vars);
parsed.env.vars.OPENCLAW_PRIMARY_MODEL_SET = selectedSlot;

if (textToImageUrl) parsed.env.vars.OPENCLAW_TEXT_TO_IMAGE_URL = textToImageUrl;
if (textToImageKey) parsed.env.vars.OPENCLAW_TEXT_TO_IMAGE_KEY = textToImageKey;
if (textToImageModel) parsed.env.vars.OPENCLAW_TEXT_TO_IMAGE_MODEL = textToImageModel;

if (imageToImageUrl) parsed.env.vars.OPENCLAW_IMAGE_TO_IMAGE_URL = imageToImageUrl;
if (imageToImageKey) parsed.env.vars.OPENCLAW_IMAGE_TO_IMAGE_KEY = imageToImageKey;
if (imageToImageModel) parsed.env.vars.OPENCLAW_IMAGE_TO_IMAGE_MODEL = imageToImageModel;

if (imageToVideoUrl) parsed.env.vars.OPENCLAW_IMAGE_TO_VIDEO_URL = imageToVideoUrl;
if (imageToVideoKey) parsed.env.vars.OPENCLAW_IMAGE_TO_VIDEO_KEY = imageToVideoKey;
if (imageToVideoModel) parsed.env.vars.OPENCLAW_IMAGE_TO_VIDEO_MODEL = imageToVideoModel;

parsed.meta = ensureObject(parsed.meta);
if (Object.prototype.hasOwnProperty.call(parsed.meta, "hfPrimaryModelSet")) {
  delete parsed.meta.hfPrimaryModelSet;
}

fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
EOF

  startup_log INFO "seeded HF model config using primary set ${selected_slot}"
}

seed_hf_china_channels_config() {
  local config_path
  config_path="${OPENCLAW_HF_RUNTIME_ROOT}/openclaw.json"

  node - <<'EOF' "${config_path}"
const fs = require("node:fs");

const configPath = process.argv[2];
const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);

const ensureObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

// 第三方 China 渠道不能直接提前写进主 channels.* 配置。
// 原因：主配置 schema 会在插件注册这些 channel id 之前先校验，提前写入会直接导致启动失败。
// 这里先只保留插件信任配置，渠道具体配置延后到插件已加载后的插件侧配置路径处理。
  parsed.plugins = ensureObject(parsed.plugins);
  parsed.plugins.allow = Array.isArray(parsed.plugins.allow) ? parsed.plugins.allow : [];
  if (!parsed.plugins.allow.includes("channels")) {
    parsed.plugins.allow.push("channels");
  }

  fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
EOF

  startup_log INFO "seeded OpenClaw China channel config from HF environment"
}

seed_hf_search_provider_config() {
  local config_path
  config_path="${OPENCLAW_HF_RUNTIME_ROOT}/openclaw.json"

  node - <<'EOF' "${config_path}"
const fs = require("node:fs");

const configPath = process.argv[2];
const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);

const ensureObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

const env = process.env;
const provider = (env.OPENCLAW_WEB_SEARCH_PROVIDER || "tavily").toLowerCase();

parsed.tools = ensureObject(parsed.tools);
parsed.tools.web = ensureObject(parsed.tools.web);
parsed.tools.web.search = ensureObject(parsed.tools.web.search);
parsed.plugins = ensureObject(parsed.plugins);
parsed.plugins.entries = ensureObject(parsed.plugins.entries);

if (provider === "tavily") {
  parsed.tools.web.search.enabled = true;
  parsed.tools.web.search.provider = "tavily";
  parsed.plugins.entries.tavily = ensureObject(parsed.plugins.entries.tavily);
  parsed.plugins.entries.tavily.enabled = true;
  parsed.plugins.entries.tavily.config = ensureObject(parsed.plugins.entries.tavily.config);
  parsed.plugins.entries.tavily.config.webSearch = {
    apiKey: {
      source: "env",
      provider: "default",
      id: "TAVILY_API_KEY",
    },
    baseUrl: "https://api.tavily.com",
  };
}

if (provider === "searxng") {
  parsed.tools.web.search.enabled = true;
  parsed.tools.web.search.provider = "searxng";
  parsed.plugins.entries.searxng = ensureObject(parsed.plugins.entries.searxng);
  parsed.plugins.entries.searxng.enabled = true;
  parsed.plugins.entries.searxng.config = ensureObject(parsed.plugins.entries.searxng.config);
  parsed.plugins.entries.searxng.config.webSearch = {
    baseUrl: {
      source: "env",
      provider: "default",
      id: "SEARXNG_BASE_URL",
    },
  };
}

parsed.env = ensureObject(parsed.env);
parsed.env.vars = ensureObject(parsed.env.vars);
parsed.env.vars.OPENCLAW_WEB_SEARCH_PROVIDER = provider;
if (env.SEARXNG_URL) parsed.env.vars.SEARXNG_URL = env.SEARXNG_URL;
if (env.SEARXNG_BASE_URL) parsed.env.vars.SEARXNG_BASE_URL = env.SEARXNG_BASE_URL;
if (env.SEARXNG_URL_BACKUP_1) parsed.env.vars.SEARXNG_URL_BACKUP_1 = env.SEARXNG_URL_BACKUP_1;
if (env.SEARXNG_URL_BACKUP_2) parsed.env.vars.SEARXNG_URL_BACKUP_2 = env.SEARXNG_URL_BACKUP_2;
if (env.SEARXNG_URL_BACKUP_3) parsed.env.vars.SEARXNG_URL_BACKUP_3 = env.SEARXNG_URL_BACKUP_3;
if (env.SEARXNG_URL_BACKUP_4) parsed.env.vars.SEARXNG_URL_BACKUP_4 = env.SEARXNG_URL_BACKUP_4;

fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
EOF

  startup_log INFO "seeded search provider config from HF environment"
}

seed_hf_skill_runtime_config() {
  local config_path
  config_path="${OPENCLAW_HF_RUNTIME_ROOT}/openclaw.json"

  node - <<'EOF' "${config_path}"
const fs = require("node:fs");

const configPath = process.argv[2];
const raw = fs.readFileSync(configPath, "utf8");
const parsed = JSON.parse(raw);

const ensureObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

parsed.skills = ensureObject(parsed.skills);
parsed.skills.load = ensureObject(parsed.skills.load);
parsed.skills.load.extraDirs = Array.isArray(parsed.skills.load.extraDirs)
  ? parsed.skills.load.extraDirs
  : [];

if (!parsed.skills.load.extraDirs.includes("/root/.openclaw/workspace/skills")) {
  parsed.skills.load.extraDirs.push("/root/.openclaw/workspace/skills");
}

parsed.agents = ensureObject(parsed.agents);
parsed.agents.defaults = ensureObject(parsed.agents.defaults);
parsed.agents.defaults.skills = Array.isArray(parsed.agents.defaults.skills)
  ? parsed.agents.defaults.skills
  : [];

for (const skillName of ["ddg-web-search", "n2-free-search"]) {
  if (!parsed.agents.defaults.skills.includes(skillName)) {
    parsed.agents.defaults.skills.push(skillName);
  }
}

fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
EOF

  startup_log INFO "seeded skill runtime config for ddg-web-search and n2-free-search"
}

restore_runtime_state() {
  startup_log INFO "restoring runtime state"
  hf_acquire_lock startup
  trap 'hf_release_lock startup' RETURN

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
    exec openclaw gateway run --bind "${gateway_bind}" --port "${gateway_port}" --allow-unconfigured ${OPENCLAW_HF_GATEWAY_EXTRA_ARGS}
  fi

  exec openclaw gateway run --bind "${gateway_bind}" --port "${gateway_port}" --allow-unconfigured
}

shutdown() {
  local exit_code=$?
  startup_log INFO "gateway wrapper shutting down"
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
print_outbound_ip

"${OPENCLAW_HF_APP_DIR}/install-extra.sh"
restore_runtime_state
seed_hf_gateway_config
seed_hf_model_config
seed_hf_china_channels_config
seed_hf_search_provider_config
seed_hf_skill_runtime_config
start_syncd
run_gateway
