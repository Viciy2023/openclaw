import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { SignalStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { t } from "../i18n/index.js";

export function renderSignalCard(params: {
  props: ChannelsProps;
  signal?: SignalStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, signal, accountCountLabel } = params;
  const i18n = t();

  return html`
    <div class="card">
      <div class="card-title">Signal</div>
      <div class="card-sub">${i18n.channels.signalSub}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${i18n.channels.configured}</span>
          <span>${signal?.configured ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.common.running}</span>
          <span>${signal?.running ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.baseUrl}</span>
          <span>${signal?.baseUrl ?? i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastStart}</span>
          <span>${signal?.lastStartAt ? formatAgo(signal.lastStartAt) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastProbe}</span>
          <span>${signal?.lastProbeAt ? formatAgo(signal.lastProbeAt) : i18n.common.na}</span>
        </div>
      </div>

      ${signal?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">${signal.lastError}</div>`
        : nothing}

      ${signal?.probe
        ? html`<div class="callout" style="margin-top: 12px;">${i18n.channels.probe} ${signal.probe.ok ? i18n.common.success : i18n.errors.loadFailed} · ${signal.probe.status ?? ""} ${signal.probe.error ?? ""}</div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "signal", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>${i18n.channels.probe}</button>
      </div>
    </div>
  `;
}
