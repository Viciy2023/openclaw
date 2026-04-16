# Hugging Face Deployment Layer

This directory contains a Hugging Face Space packaging layer for OpenClaw.

Goals:

- Keep the runtime install shape aligned with a root-level global install.
- Preserve the default OpenClaw state path at `/root/.openclaw`.
- Persist long-lived state in the mounted Hugging Face bucket at `/data`.
- Run a lightweight background sync daemon alongside the gateway.

Files:

- `Dockerfile`: builds the HF runtime image from the published OpenClaw container image and installs the root-global `openclaw` CLI.
- `install-extra.sh`: placeholder hook for future plugin, skill, and dependency installs.
- `start-hf.sh`: container entrypoint that restores `/root/.openclaw`, starts the sync daemon, and launches the gateway.
- `syncd.sh`: background sync loop that pushes runtime state back into `/data/openclaw`.
- `hf-sync.sh`: manual operator tool for `status`, `restore`, `flush`, and manifest inspection.
- `lib/common.sh`: shared helpers used by the startup and sync scripts.

Persistent layout under `/data`:

- `/data/openclaw/live/.openclaw`: persisted OpenClaw state.
- `/data/openclaw/sync`: manifests, queue position, snapshots, and lock files.
- `/data/openclaw/logs`: sync daemon logs and archived temporary logs.
- `/data/openclaw/install`: persisted install-time assets for future customization.

State handling model:

- Strong persisted paths are linked or copied from `/data/openclaw/live/.openclaw` into `/root/.openclaw`.
- Default strong persisted files: `openclaw.json`, `auth-profiles.json`.
- Default strong persisted directories: `credentials/`, `agents/`, `workspace/`, `skills/`.
- Local-then-sync directories: `cron/`, `media/`.
- Temporary log archives are copied from `/tmp/openclaw` into `/data/openclaw/logs/archive`.
- Sync manifests are file-level JSON snapshots under `/data/openclaw/sync/manifests`.

Important environment variables:

- `OPENCLAW_HF_DATA_ROOT`: persistent root under the mounted bucket. Default: `/data/openclaw`.
- `OPENCLAW_HF_SYNC_ENABLED`: set to `0` to disable the background sync daemon.
- `OPENCLAW_HF_GATEWAY_PORT`: gateway port. Default: `18789`.
- `OPENCLAW_HF_GATEWAY_BIND`: gateway bind mode. Default: `lan`.
- `OPENCLAW_HF_GATEWAY_EXTRA_ARGS`: extra arguments appended to `openclaw gateway run`.
- `OPENCLAW_HF_STATE_LINK_MODE`: `mixed` or `copy`. Default: `mixed`.
- `OPENCLAW_HF_SNAPSHOT_LIMIT`: max retained snapshots per snapshot directory. Default: `20`.
- `OPENCLAW_HF_MANIFEST_HASH_LIMIT_BYTES`: hash only files up to this size when writing manifests. Default: `10485760`.
- `OPENCLAW_HF_CONFIG_CONFLICT_POLICY`: `data_wins`, `runtime_wins`, or `newer_wins`. Default: `data_wins`.
- `OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY`: `data_wins`, `runtime_wins`, or `newer_wins`. Default: `data_wins`.
- `OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY`: `newer_wins`, `data_wins`, or `runtime_wins`. Default: `newer_wins`.

Notes:

- This layer does not modify OpenClaw core code.
- Runtime state is restored into `/root/.openclaw` on startup, then synchronized back to `/data/openclaw` on a tiered schedule.
- Temporary logs under `/tmp/openclaw` are archived into `/data/openclaw/logs/archive` rather than treated as strong persistent state.
- If you want persistent custom bootstrap logic, place an executable script at `/data/openclaw/install/bootstrap/install-extra.local.sh`.
- Manual operations are available through `/opt/openclaw-hf/hf-sync.sh` inside the container.
