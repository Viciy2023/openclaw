---
title: Workers
emoji: "🦀"
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 18789
pinned: false
---

# Hugging Face 部署层说明

这个目录是 OpenClaw 在 Hugging Face Space 上的部署包装层。

## 目标

- 保持运行时安装形态尽量接近根级全局安装的 `openclaw` CLI。
- 保留 OpenClaw 默认状态目录 `/root/.openclaw`。
- 将长期状态持久化到 Hugging Face 挂载存储 `/data`。
- 在网关旁边运行一个轻量后台同步进程。
- 尽量避免运行时联网安装，降低 HF 风控风险。

## 目录内文件说明

- `Dockerfile`：基于已发布的 OpenClaw 容器镜像构建 HF 运行镜像，并安装根级全局 `openclaw` CLI。
- `install-extra.sh`：HF 启动阶段的补充安装钩子。当前主要负责恢复镜像预置扩展、恢复技能、复制公众号工作区项目，以及写入公众号凭证文件。
- `start-hf.sh`：容器入口脚本。负责恢复 `/root/.openclaw`、启动同步进程、加载 `/data/.env`，然后启动网关。
- `syncd.sh`：后台同步循环，把运行时状态写回 `/data/openclaw`。
- `hf-sync.sh`：容器内手动运维工具，可用于 `status`、`restore`、`flush` 和查看同步清单。
- `lib/common.sh`：HF 启动和同步脚本共用的基础函数。

## `/data` 下的持久化布局

- `/data/openclaw/live/.openclaw`：持久化的 OpenClaw 运行状态。
- `/data/openclaw/sync`：同步清单、队列、快照和锁文件。
- `/data/openclaw/logs`：同步日志和临时日志归档。
- `/data/openclaw/install`：安装期资产、自定义脚本和后续扩展放置目录。

## 状态处理模型

- 强持久化路径会从 `/data/openclaw/live/.openclaw` 链接或复制到 `/root/.openclaw`。
- 默认强持久化文件：`openclaw.json`、`auth-profiles.json`。
- 默认强持久化目录：`credentials/`、`agents/`、`workspace/`、`skills/`。
- 本地运行后再同步的目录：`cron/`、`media/`、`extensions/`。
- `/tmp/openclaw` 下的临时日志会归档到 `/data/openclaw/logs/archive`。
- 同步清单以文件级 JSON 快照形式写入 `/data/openclaw/sync/manifests`。

## 重要环境变量

- `OPENCLAW_HF_BUCKET_ENV_FILE`：必需的环境变量文件路径。默认值：`/data/.env`。HF 运行时只从这个文件读取环境变量；如果文件不存在，启动会直接失败。
- `OPENCLAW_HF_DATA_ROOT`：持久化根目录。默认值：`/data/openclaw`。
- `OPENCLAW_HF_SYNC_ENABLED`：设为 `0` 可关闭后台同步进程。
- `OPENCLAW_HF_GATEWAY_PORT`：网关端口。默认值：`18789`。
- `OPENCLAW_HF_GATEWAY_BIND`：网关绑定模式。默认值：`lan`。
- `OPENCLAW_HF_GATEWAY_EXTRA_ARGS`：附加到 `openclaw gateway run` 的额外参数。
- `OPENCLAW_HF_ENABLE_BONJOUR`：仅当你的 HF 运行环境确实支持 mDNS/Bonjour 时设为 `1`。默认关闭，因为 HF 容器网络可能触发 `@homebridge/ciao` 探测异常并导致进程退出。
- `OPENCLAW_HF_WECHAT_GZH_SOURCE_DIR`：公众号项目来源目录。默认值：`/data/wechat-allauto-gzh-main`。
- `OPENCLAW_HF_WECHAT_GZH_RUNTIME_DIR`：公众号项目运行时目标目录。默认值：`/root/.openclaw/workspace/wechat-allauto-gzh`。
- `OPENCLAW_CLAWEDIT_TEXT_TO_IMAGE_MODEL_SET`：`clawedit` 自己使用哪一套文生图模型。支持 `FIRST` / `SECOND`，也兼容 `1` / `2`。它与主项目的 `OPENCLAW_TEXT_TO_IMAGE_MODEL_SET` 解耦，可以单独选择。
- `OPENCLAW_CLAWEDIT_TEXT_TO_IMAGE_FIRST_URL / KEY / MODEL`：`clawedit` 第一套文生图模型配置。
- `OPENCLAW_CLAWEDIT_TEXT_TO_IMAGE_SECOND_URL / KEY / MODEL`：`clawedit` 第二套文生图模型配置。
- `OPENCLAW_HF_STATE_LINK_MODE`：状态链接模式，支持 `mixed` 或 `copy`。默认值：`mixed`。
- `OPENCLAW_HF_SNAPSHOT_LIMIT`：每类快照保留上限。默认值：`20`。
- `OPENCLAW_HF_MANIFEST_HASH_LIMIT_BYTES`：写同步清单时参与哈希的文件大小上限。默认值：`10485760`。
- `OPENCLAW_HF_CONFIG_CONFLICT_POLICY`：配置冲突策略，支持 `data_wins`、`runtime_wins`、`newer_wins`。默认值：`data_wins`。
- `OPENCLAW_HF_STRONG_DIR_RESTORE_POLICY`：强持久化目录恢复策略，支持 `data_wins`、`runtime_wins`、`newer_wins`。默认值：`data_wins`。
- `OPENCLAW_HF_LOCAL_SYNC_RESTORE_POLICY`：本地同步目录恢复策略，支持 `newer_wins`、`data_wins`、`runtime_wins`。默认值：`newer_wins`。

## `.env` 文件规则

- HF 实际运行时只认 `/data/.env`。
- `start-hf.sh` 会在加载其他 HF 辅助逻辑之前先读取 `/data/.env`。
- 这层部署逻辑当前设计为：只从 bucket 挂载出来的 `.env` 读取运行时变量，不有意回退到 HF Space Secrets。
- `huggingface/.env` 是本地维护/参考文件，用于你在仓库里管理变量样例或本地对照；它不是 HF 容器运行时直接读取的文件。
- 如果 `/data/.env` 缺失、不可读或语法错误，HF 启动会失败。

## 公众号项目接入说明

- 当前 HF 安装钩子会把 `wechat-allauto-gzh` 从 `/data` 本地复制到运行时工作区。
- 默认复制路径：`/data/wechat-allauto-gzh-main` -> `/root/.openclaw/workspace/wechat-allauto-gzh`。
- 如果设置了 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，启动时会自动生成：
  - `/root/.openclaw/workspace/wechat-allauto-gzh/credentials.json`
- 当前实现是“storage 本地复制版”，不会在运行时执行 `git clone`、`npm install`、`pnpm install` 或 `pip install`。

## ClawEdit 插件说明

- `clawedit` 采用“storage 本地复制到 extensions”方案。
- 默认复制路径：`/data/clawedit` -> `/root/.openclaw/extensions/clawedit`。
- 启动时会自动启用 `plugins.entries.clawedit.enabled=true`，并根据 HF 环境变量写入最小运行配置。
- `clawedit` 的文生图模型可以与主项目完全独立：
  - 主项目文生图选择器：`OPENCLAW_TEXT_TO_IMAGE_MODEL_SET`
  - `clawedit` 文生图选择器：`OPENCLAW_CLAWEDIT_TEXT_TO_IMAGE_MODEL_SET`
- 例如你可以让：
  - 主项目文生图走 `FIRST`
  - `clawedit` 文生图走 `SECOND`
- `clawedit` 会优先读取自己的独立文生图变量；如果未设置，再回退到主项目的文生图变量。

## 其他说明

- 这一层不会修改 OpenClaw 主仓核心源码行为，只负责 HF 部署包装。
- 运行状态会先恢复到 `/root/.openclaw`，再按分层策略同步回 `/data/openclaw`。
- `/tmp/openclaw` 下的日志会归档到 `/data/openclaw/logs/archive`，不会被当成强持久化状态。
- 如果你需要持久化自定义启动逻辑，可以把可执行脚本放到：
  - `/data/openclaw/install/bootstrap/install-extra.local.sh`
- 容器内可通过下面工具做手动运维：
  - `/opt/openclaw-hf/hf-sync.sh`
