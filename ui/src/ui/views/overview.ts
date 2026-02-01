import { html } from "lit";

import type { GatewayHelloOk } from "../gateway";
import { formatAgo, formatDurationMs } from "../format";
import { formatNextRun } from "../presenter";
import type { UiSettings } from "../storage";
import { t, getLanguage, setLanguage, getSupportedLanguages, type SupportedLanguage } from "../i18n/index.js";

export type OverviewProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
  settings: UiSettings;
  password: string;
  lastError: string | null;
  presenceCount: number;
  sessionsCount: number | null;
  cronEnabled: boolean | null;
  cronNext: number | null;
  lastChannelsRefresh: number | null;
  onSettingsChange: (next: UiSettings) => void;
  onPasswordChange: (next: string) => void;
  onSessionKeyChange: (next: string) => void;
  onConnect: () => void;
  onRefresh: () => void;
};

export function renderOverview(props: OverviewProps) {
  const i18n = t();
  const snapshot = props.hello?.snapshot as
    | { uptimeMs?: number; policy?: { tickIntervalMs?: number } }
    | undefined;
  const uptime = snapshot?.uptimeMs ? formatDurationMs(snapshot.uptimeMs) : i18n.common.na;
  const tick = snapshot?.policy?.tickIntervalMs
    ? `${snapshot.policy.tickIntervalMs}ms`
    : i18n.common.na;
  const authHint = (() => {
    if (props.connected || !props.lastError) return null;
    const lower = props.lastError.toLowerCase();
    const authFailed = lower.includes("unauthorized") || lower.includes("connect failed");
    if (!authFailed) return null;
    const hasToken = Boolean(props.settings.token.trim());
    const hasPassword = Boolean(props.password.trim());
    if (!hasToken && !hasPassword) {
      return html`
        <div class="muted" style="margin-top: 8px;">
          ${i18n.overview.authHintNoCredentials}
          <div style="margin-top: 6px;">
            <span class="mono">openclaw dashboard --no-open</span> ${i18n.overview.authHintTokenizedUrl}<br />
            <span class="mono">openclaw doctor --generate-gateway-token</span> ${i18n.overview.authHintSetToken}
          </div>
          <div style="margin-top: 6px;">
            <a class="session-link" href="https://docs.openclaw.ai/web/dashboard" target="_blank" rel="noreferrer">${i18n.overview.docsControlUiAuth}</a>
          </div>
        </div>
      `;
    }
    return html`
      <div class="muted" style="margin-top: 8px;">
        ${i18n.overview.authHintFailed}
        <span class="mono">openclaw dashboard --no-open</span>${i18n.overview.authHintThenConnect}
        <div style="margin-top: 6px;">
          <a class="session-link" href="https://docs.openclaw.ai/web/dashboard" target="_blank" rel="noreferrer">${i18n.overview.docsControlUiAuth}</a>
        </div>
      </div>
    `;
  })();
  const insecureContextHint = (() => {
    if (props.connected || !props.lastError) return null;
    const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : true;
    if (isSecureContext !== false) return null;
    const lower = props.lastError.toLowerCase();
    if (!lower.includes("secure context") && !lower.includes("device identity required")) {
      return null;
    }
    return html`
      <div class="muted" style="margin-top: 8px;">
        ${i18n.overview.insecureContextHint}
        <span class="mono">http://127.0.0.1:18789</span> ${i18n.overview.insecureContextHint2}
        <div style="margin-top: 6px;">
          ${i18n.overview.insecureContextHint3}
          <span class="mono">gateway.controlUi.allowInsecureAuth: true</span> ${i18n.overview.insecureContextHint4}
        </div>
        <div style="margin-top: 6px;">
          <a class="session-link" href="https://docs.openclaw.ai/gateway/tailscale" target="_blank" rel="noreferrer">${i18n.overview.docsTailscaleServe}</a>
          <span class="muted"> · </span>
          <a class="session-link" href="https://docs.openclaw.ai/web/control-ui#insecure-http" target="_blank" rel="noreferrer">${i18n.overview.docsInsecureHttp}</a>
        </div>
      </div>
    `;
  })();

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">${i18n.overview.gatewayAccess}</div>
        <div class="card-sub">${i18n.overview.gatewayAccessSub}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${i18n.overview.websocketUrl}</span>
            <input .value=${props.settings.gatewayUrl} @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value; props.onSettingsChange({ ...props.settings, gatewayUrl: v }); }} placeholder="ws://100.x.y.z:18789" />
          </label>
          <label class="field">
            <span>${i18n.overview.gatewayToken}</span>
            <input .value=${props.settings.token} @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value; props.onSettingsChange({ ...props.settings, token: v }); }} placeholder="OPENCLAW_GATEWAY_TOKEN" />
          </label>
          <label class="field">
            <span>${i18n.overview.passwordNotStored}</span>
            <input type="password" .value=${props.password} @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value; props.onPasswordChange(v); }} placeholder="${i18n.overview.passwordPlaceholder}" />
          </label>
          <label class="field">
            <span>${i18n.overview.defaultSessionKey}</span>
            <input .value=${props.settings.sessionKey} @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value; props.onSessionKeyChange(v); }} />
          </label>
        </div>
        <div class="row" style="margin-top: 14px;">
          <button class="btn" @click=${() => props.onConnect()}>${i18n.common.connect}</button>
          <button class="btn" @click=${() => props.onRefresh()}>${i18n.common.refresh}</button>
          <span class="muted">${i18n.overview.clickConnectHint}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${i18n.overview.snapshot}</div>
        <div class="card-sub">${i18n.overview.snapshotSub}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat"><div class="stat-label">${i18n.common.status}</div><div class="stat-value ${props.connected ? "ok" : "warn"}">${props.connected ? i18n.common.connected : i18n.common.disconnected}</div></div>
          <div class="stat"><div class="stat-label">${i18n.overview.uptime}</div><div class="stat-value">${uptime}</div></div>
          <div class="stat"><div class="stat-label">${i18n.overview.tickInterval}</div><div class="stat-value">${tick}</div></div>
          <div class="stat"><div class="stat-label">${i18n.overview.lastChannelsRefresh}</div><div class="stat-value">${props.lastChannelsRefresh ? formatAgo(props.lastChannelsRefresh) : i18n.common.na}</div></div>
        </div>
        ${props.lastError ? html`<div class="callout danger" style="margin-top: 14px;"><div>${props.lastError}</div>${authHint ?? ""}${insecureContextHint ?? ""}</div>` : html`<div class="callout" style="margin-top: 14px;">${i18n.overview.channelsHint}</div>`}
      </div>
    </section>
    <section class="grid grid-cols-3" style="margin-top: 18px;">
      <div class="card stat-card"><div class="stat-label">${i18n.overview.instances}</div><div class="stat-value">${props.presenceCount}</div><div class="muted">${i18n.overview.instancesSub}</div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.overview.sessionsCount}</div><div class="stat-value">${props.sessionsCount ?? i18n.common.na}</div><div class="muted">${i18n.overview.sessionsSub}</div></div>
      <div class="card stat-card"><div class="stat-label">${i18n.overview.cron}</div><div class="stat-value">${props.cronEnabled == null ? i18n.common.na : props.cronEnabled ? i18n.common.enabled : i18n.common.disabled}</div><div class="muted">${i18n.overview.cronNextWake} ${formatNextRun(props.cronNext)}</div></div>
    </section>
    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.nav.settings}</div>
      <div class="card-sub">${i18n.config.subtitle}</div>
      <div class="form-grid" style="margin-top: 16px;">
        <label class="field">
          <span>${i18n.common.language}</span>
          <select .value=${getLanguage()} @change=${(e: Event) => { const lang = (e.target as HTMLSelectElement).value as SupportedLanguage; setLanguage(lang); window.location.reload(); }}>
            ${getSupportedLanguages().map((lang) => html`<option value=${lang.code} ?selected=${lang.code === getLanguage()}>${lang.nativeLabel}</option>`)}
          </select>
        </label>
      </div>
    </section>
    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.overview.notes}</div>
      <div class="card-sub">${i18n.overview.notesSub}</div>
      <div class="note-grid" style="margin-top: 14px;">
        <div><div class="note-title">${i18n.overview.tailscaleServe}</div><div class="muted">${i18n.overview.tailscaleServeSub}</div></div>
        <div><div class="note-title">${i18n.overview.sessionHygiene}</div><div class="muted">${i18n.overview.sessionHygieneSub}</div></div>
        <div><div class="note-title">${i18n.overview.cronReminders}</div><div class="muted">${i18n.overview.cronRemindersSub}</div></div>
      </div>
    </section>
  `;
}
