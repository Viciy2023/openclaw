import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { DiscordStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { t } from "../i18n/index.js";

export function renderDiscordCard(params: {
  props: ChannelsProps;
  discord?: DiscordStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, discord, accountCountLabel } = params;
  const i18n = t();

  return html`
    <div class="card">
      <div class="card-title">Discord</div>
      <div class="card-sub">${i18n.channels.discordSub}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${i18n.channels.configured}</span>
          <span>${discord?.configured ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.common.running}</span>
          <span>${discord?.running ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastStart}</span>
          <span>${discord?.lastStartAt ? formatAgo(discord.lastStartAt) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastProbe}</span>
          <span>${discord?.lastProbeAt ? formatAgo(discord.lastProbeAt) : i18n.common.na}</span>
        </div>
      </div>

      ${discord?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">${discord.lastError}</div>`
        : nothing}

      ${discord?.probe
        ? html`<div class="callout" style="margin-top: 12px;">${i18n.channels.probe} ${discord.probe.ok ? i18n.common.success : i18n.errors.loadFailed} · ${discord.probe.status ?? ""} ${discord.probe.error ?? ""}</div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "discord", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>${i18n.channels.probe}</button>
      </div>
    </div>
  `;
}
