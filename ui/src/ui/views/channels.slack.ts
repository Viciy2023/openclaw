import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { SlackStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { t } from "../i18n/index.js";

export function renderSlackCard(params: {
  props: ChannelsProps;
  slack?: SlackStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, slack, accountCountLabel } = params;
  const i18n = t();

  return html`
    <div class="card">
      <div class="card-title">Slack</div>
      <div class="card-sub">${i18n.channels.slackSub}</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">${i18n.channels.configured}</span>
          <span>${slack?.configured ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.common.running}</span>
          <span>${slack?.running ? i18n.common.yes : i18n.common.no}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastStart}</span>
          <span>${slack?.lastStartAt ? formatAgo(slack.lastStartAt) : i18n.common.na}</span>
        </div>
        <div>
          <span class="label">${i18n.channels.lastProbe}</span>
          <span>${slack?.lastProbeAt ? formatAgo(slack.lastProbeAt) : i18n.common.na}</span>
        </div>
      </div>

      ${slack?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">${slack.lastError}</div>`
        : nothing}

      ${slack?.probe
        ? html`<div class="callout" style="margin-top: 12px;">${i18n.channels.probe} ${slack.probe.ok ? i18n.common.success : i18n.errors.loadFailed} · ${slack.probe.status ?? ""} ${slack.probe.error ?? ""}</div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "slack", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>${i18n.channels.probe}</button>
      </div>
    </div>
  `;
}
