import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { GoogleChatStatus } from "../types";
import { renderChannelConfigSection } from "./channels.config";
import type { ChannelsProps } from "./channels.types";
import { t } from "../i18n/index.js";

export function renderGoogleChatCard(params: {
  props: ChannelsProps;
  googleChat?: GoogleChatStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, googleChat, accountCountLabel } = params;
  const i18n = t();

  return html`
    <div class="card">
      <div class="card-title">${i18n.googlechat.title}</div>
      <div class="card-sub">${i18n.googlechat.subtitle}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${i18n.googlechat.configured}</span>
          <span>${googleChat ? (googleChat.configured ? i18n.common.yes : i18n.common.no) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.googlechat.running}</span>
          <span>${googleChat ? (googleChat.running ? i18n.common.yes : i18n.common.no) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.googlechat.credential}</span>
          <span>${googleChat?.credentialSource ?? i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.googlechat.audience}</span>
          <span>
            ${googleChat?.audienceType
              ? `${googleChat.audienceType}${googleChat.audience ? ` · ${googleChat.audience}` : ""}`
              : i18n.common.na}
          </span>
        </div>
        <div>
          <span class="label">${i18n.googlechat.lastStart}</span>
          <span>${googleChat?.lastStartAt ? formatAgo(googleChat.lastStartAt) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.googlechat.lastProbe}</span>
          <span>${googleChat?.lastProbeAt ? formatAgo(googleChat.lastProbeAt) : i18n.common.na}</span>
        </div>
      </div>

      ${googleChat?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">
            ${googleChat.lastError}
          </div>`
        : nothing}

      ${googleChat?.probe
        ? html`<div class="callout" style="margin-top: 12px;">
            ${i18n.googlechat.probe} ${googleChat.probe.ok ? i18n.googlechat.probeOk : i18n.googlechat.probeFailed} ·
            ${googleChat.probe.status ?? ""} ${googleChat.probe.error ?? ""}
          </div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "googlechat", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${i18n.googlechat.probe}
        </button>
      </div>
    </div>
  `;
}
