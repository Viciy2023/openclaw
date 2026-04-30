FROM ghcr.io/openclaw/openclaw:latest

USER root

ENV HOME=/root
ENV OPENCLAW_HF_APP_DIR=/opt/openclaw-hf
ENV OPENCLAW_HF_BUCKET_ENV_FILE=/data/.env
ENV OPENCLAW_HF_DATA_ROOT=/data/openclaw
ENV OPENCLAW_HF_SYNC_ENABLED=1
ENV OPENCLAW_HF_GATEWAY_PORT=18789
ENV OPENCLAW_HF_GATEWAY_BIND=lan
ENV OPENCLAW_HF_GATEWAY_EXTRA_ARGS=
ENV OPENCLAW_TEXT_TO_IMAGE_MODEL_SET=FIRST
ENV OPENCLAW_AGENT_BROWSER_CHROME_PATH=/usr/bin/chromium
ENV OPENCLAW_WECOM_PLUGIN_TARBALL=https://registry.npmjs.org/@openclaw-china/wecom/-/wecom-2026.3.29.tgz
ENV OPENCLAW_WECOM_APP_PLUGIN_TARBALL=https://registry.npmjs.org/@openclaw-china/wecom-app/-/wecom-app-2026.3.29.tgz
ENV OPENCLAW_WEIXIN_PLUGIN_TARBALL=https://registry.npmjs.org/@tencent-weixin/openclaw-weixin/-/openclaw-weixin-2.1.9.tgz

RUN node -e "const fs=require('node:fs'); const path='/app/package.json'; const pkg=JSON.parse(fs.readFileSync(path,'utf8')); if (pkg.dependencies) delete pkg.dependencies['@whiskeysockets/baileys']; if (pkg.pnpm?.onlyBuiltDependencies && Array.isArray(pkg.pnpm.onlyBuiltDependencies)) { pkg.pnpm.onlyBuiltDependencies = pkg.pnpm.onlyBuiltDependencies.filter((entry) => entry !== '@whiskeysockets/baileys'); } if (pkg.pnpm?.patchedDependencies) { delete pkg.pnpm.patchedDependencies['@whiskeysockets/baileys@7.0.0-rc.9']; if (Object.keys(pkg.pnpm.patchedDependencies).length === 0) delete pkg.pnpm.patchedDependencies; } fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');"

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      coreutils \
      curl \
      ffmpeg \
      findutils \
      git \
      chromium \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo-gobject2 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libfontconfig1 \
      libfreetype6 \
      libgbm1 \
      libgdk-pixbuf-2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      procps \
      python3-pip \
      rsync \
      libx11-6 \
      libx11-xcb1 \
      libxcb-shm0 \
      libxcb1 \
      libxcomposite1 \
      libxcursor1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      libxrender1 \
      libxshmfence1 \
      libxi6 \
      util-linux && \
    npm install -g agent-browser@latest && \
    python3 -m pip install --no-cache-dir --break-system-packages tavily-python Pillow && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /root/.openclaw /data /opt/openclaw-hf /opt/openclaw-hf/prebuilt/extensions /opt/openclaw-hf/prebuilt/skills /root/.openclaw/workspace/skills

RUN bash -lc 'set -euo pipefail; \
    build_root="/tmp/openclaw-plugin-build"; \
    mkdir -p "${build_root}" "/opt/openclaw-hf/prebuilt/extensions"; \
    fetch_and_prepare_plugin() { \
      plugin_id="$1"; \
      tarball_url="$2"; \
      plugin_root="${build_root}/${plugin_id}"; \
      archive_path="${plugin_root}.tgz"; \
      mkdir -p "${plugin_root}"; \
      curl -fsSL "${tarball_url}" -o "${archive_path}"; \
      tar -xzf "${archive_path}" -C "${plugin_root}"; \
      if [ ! -d "${plugin_root}/package" ]; then \
        echo "plugin archive missing package/ root: ${plugin_id}" >&2; \
        exit 1; \
      fi; \
      npm install --omit=dev --prefix "${plugin_root}/package"; \
      cp -a "${plugin_root}/package" "/opt/openclaw-hf/prebuilt/extensions/${plugin_id}"; \
    }; \
    fetch_and_prepare_plugin wecom "${OPENCLAW_WECOM_PLUGIN_TARBALL}"; \
    fetch_and_prepare_plugin wecom-app "${OPENCLAW_WECOM_APP_PLUGIN_TARBALL}"; \
    fetch_and_prepare_plugin openclaw-weixin "${OPENCLAW_WEIXIN_PLUGIN_TARBALL}"; \
    rm -rf "${build_root}"'

RUN cd /root/.openclaw/workspace && \
    npx -y clawhub@latest install ddg-web-search --force && \
    npx -y clawhub@latest install n2-free-search --force && \
    cp -a /root/.openclaw/workspace/skills/ddg-web-search /opt/openclaw-hf/prebuilt/skills/ddg-web-search && \
    cp -a /root/.openclaw/workspace/skills/n2-free-search /opt/openclaw-hf/prebuilt/skills/n2-free-search

COPY lib/common.sh /opt/openclaw-hf/lib/common.sh
COPY cron/jobs.json /opt/openclaw-hf/cron/jobs.json
COPY install-extra.sh /opt/openclaw-hf/install-extra.sh
COPY syncd.sh /opt/openclaw-hf/syncd.sh
COPY hf-sync.sh /opt/openclaw-hf/hf-sync.sh
COPY qwen-image-bridge.py /opt/openclaw-hf/qwen-image-bridge.py
COPY weixin-image-normalizer.py /opt/openclaw-hf/weixin-image-normalizer.py
COPY start-hf.sh /opt/openclaw-hf/start-hf.sh

RUN chmod 755 /opt/openclaw-hf/install-extra.sh /opt/openclaw-hf/syncd.sh /opt/openclaw-hf/hf-sync.sh /opt/openclaw-hf/qwen-image-bridge.py /opt/openclaw-hf/weixin-image-normalizer.py /opt/openclaw-hf/start-hf.sh && \
    chmod 644 /opt/openclaw-hf/lib/common.sh

WORKDIR /root

ENTRYPOINT ["/opt/openclaw-hf/start-hf.sh"]
