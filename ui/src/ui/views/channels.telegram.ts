import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { ChannelAccountSnapshot, TelegramStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { t } from "../i18n/index.js";

export function renderTelegramCard(params: {
  props: ChannelsProps;
  telegram?: TelegramStatus;
  telegramAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
}) {
  const { props, telegram, telegramAccounts, accountCountLabel } = params;
  const i18n = t();
  const hasMultipleAccounts = telegramAccounts.length > 1;

  const renderAccountCard = (account: ChannelAccountSnapshot) => {
    const probe = account.probe as { bot?: { username?: string } } | undefined;
    const botUsername = probe?.bot?.username;
    const label = account.name || account.accountId;
    return html`
      <div class="account-card">
        <div class="account-card-header">
          <div class="account-card-title">
            ${botUsername ? `@${botUsername}` : label}
          </div>
          <div class="account-card-id">${account.accountId}</div>
        </div>
        <div class="status-list account-card-status">
          <div>
            <span class="label">${i18n.common.running}</span>
            <span>${account.running ? i18n.common.yes : i18n.common.no}</span>
          </div>
          <div>
            <span class="label">${i18n.channels.configured}</span>
            <span>${account.configured ? i18n.common.yes : i18n.common.no}</span>
          </div>
          <div>
            <span class="label">${i18n.channels.lastInbound}</span>
            <span>${account.lastInboundAt ? formatAgo(account.lastInboundAt) : i18n.common.na}</span>
          </div>
          ${account.lastError
            ? html`
                <div class="account-card-error">
                  ${account.lastError}
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  };

  return html`
    <div class="card">
      <div class="card-title">Telegram</div>
      <div class="card-sub">${i18n.channels.telegramSub}</div>
      ${accountCountLabel}

      ${hasMultipleAccounts
        ? html`
            <div class="account-card-list">
              ${telegramAccounts.map((account) => renderAccountCard(account))}
            </div>
          `
        : html`
            <div class="status-list" style="margin-top: 16px;">
              <div>
                <span class="label">${i18n.channels.configured}</span>
                <span>${telegram?.configured ? i18n.common.yes : i18n.common.no}</span>
              </div>
              <div>
                <span class="label">${i18n.common.running}</span>
                <span>${telegram?.running ? i18n.common.yes : i18n.common.no}</span>
              </div>
              <div>
                <span class="label">${i18n.channels.mode}</span>
                <span>${telegram?.mode ?? i18n.common.na}</span>
              </div>
              <div>
                <span class="label">${i18n.channels.lastStart}</span>
                <span>${telegram?.lastStartAt ? formatAgo(telegram.lastStartAt) : i18n.common.na}</span>
              </div>
              <div>
                <span class="label">${i18n.channels.lastProbe}</span>
                <span>${telegram?.lastProbeAt ? formatAgo(telegram.lastProbeAt) : i18n.common.na}</span>
              </div>
            </div>
          `}

      ${telegram?.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">
            ${telegram.lastError}
          </div>`
        : nothing}

      ${telegram?.probe
        ? html`<div class="callout" style="margin-top: 12px;">
            ${i18n.channels.probe} ${telegram.probe.ok ? i18n.common.success : i18n.errors.loadFailed} ·
            ${telegram.probe.status ?? ""} ${telegram.probe.error ?? ""}
          </div>`
        : nothing}

      ${renderChannelConfigSection({ channelId: "telegram", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          ${i18n.channels.probe}
        </button>
      </div>
    </div>
  `;
}
