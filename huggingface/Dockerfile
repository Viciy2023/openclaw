FROM ghcr.io/openclaw/openclaw:latest

USER root

ENV HOME=/root
ENV OPENCLAW_HF_APP_DIR=/opt/openclaw-hf
ENV OPENCLAW_HF_DATA_ROOT=/data/openclaw
ENV OPENCLAW_HF_SYNC_ENABLED=1
ENV OPENCLAW_HF_GATEWAY_PORT=18789
ENV OPENCLAW_HF_GATEWAY_BIND=lan
ENV OPENCLAW_HF_GATEWAY_EXTRA_ARGS=

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
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /root/.openclaw /data /opt/openclaw-hf

COPY lib/common.sh /opt/openclaw-hf/lib/common.sh
COPY install-extra.sh /opt/openclaw-hf/install-extra.sh
COPY syncd.sh /opt/openclaw-hf/syncd.sh
COPY hf-sync.sh /opt/openclaw-hf/hf-sync.sh
COPY start-hf.sh /opt/openclaw-hf/start-hf.sh

RUN chmod 755 /opt/openclaw-hf/install-extra.sh /opt/openclaw-hf/syncd.sh /opt/openclaw-hf/hf-sync.sh /opt/openclaw-hf/start-hf.sh && \
    chmod 644 /opt/openclaw-hf/lib/common.sh

WORKDIR /root

ENTRYPOINT ["/opt/openclaw-hf/start-hf.sh"]
