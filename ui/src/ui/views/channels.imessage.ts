import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { IMessageStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { t } from "../i18n/index.js";

export function renderIMessageCard(params: {
  props: ChannelsProps;
  imessage?: IMessageStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, imessage, accountCountLabel } = params;
  const i18n = t();

  return html`
    <div class="card">
      <div class="card-title">${i18n.imessage.title}</div>
      <div class="card-sub">${i18n.imessage.subtitle}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${i18n.imessage.configured}</span>
          <span>${imessage?.configured ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.imessage.running}</span>
          <span>${imessage?.running ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.imessage.lastStart}</span>
          <span>${imessage?.lastStartAt ? formatAgo(imessage.lastStartAt) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.imessage.lastProbe}</span>
          <span>${imessage?.lastProbeAt ? formatAgo(imessage.lastProbeAt) : i18n.common.na}</span>
        </div>
      </div>

      ${imessage?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">
            ${imessage.lastError}
          </div>`
        : nothing}

      ${imessage?.probe
        ? html`<div class="callout" style="margin-top: 12px;">
            ${i18n.imessage.probe} ${imessage.probe.ok ? i18n.imessage.probeOk : i18n.imessage.probeFailed} ·
            ${imessage.probe.error ?? ""}
          </div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "imessage", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${i18n.imessage.probe}
        </button>
      </div>
    </div>
  `;
}
