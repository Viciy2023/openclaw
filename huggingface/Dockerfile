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
      findutils \
      procps \
      rsync \
      util-linux && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g openclaw@latest --no-fund --no-audit --loglevel=error && \
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
