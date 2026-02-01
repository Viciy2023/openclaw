import { html, nothing } from "lit";

import { formatPresenceAge, formatPresenceSummary } from "../presenter";
import type { PresenceEntry } from "../types";
import { t } from "../i18n/index.js";

export type InstancesProps = {
  loading: boolean;
  entries: PresenceEntry[];
  lastError: string | null;
  statusMessage: string | null;
  onRefresh: () => void;
};

export function renderInstances(props: InstancesProps) {
  const i18n = t();
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${i18n.instances.title}</div>
          <div class="card-sub">${i18n.overview.instancesSub}</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? i18n.common.loadingEllipsis : i18n.common.refresh}
        </button>
      </div>
      ${props.lastError
        ? html`<div class="callout danger" style="margin-top: 12px;">
            ${props.lastError}
          </div>`
        : nothing}
      ${props.statusMessage
        ? html`<div class="callout" style="margin-top: 12px;">
            ${props.statusMessage}
          </div>`
        : nothing}
      <div class="list" style="margin-top: 16px;">
        ${props.entries.length === 0
          ? html`<div class="muted">${i18n.common.noData}</div>`
          : props.entries.map((entry) => renderEntry(entry, i18n))}
      </div>
    </section>
  `;
}

function renderEntry(entry: PresenceEntry, i18n: ReturnType<typeof t>) {
  const lastInput =
    entry.lastInputSeconds != null
      ? `${entry.lastInputSeconds}${i18n.time.seconds} ${i18n.time.ago}`
      : i18n.common.na;
  const mode = entry.mode ?? i18n.sessions.unknown;
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(Boolean) : [];
  const scopes = Array.isArray(entry.scopes) ? entry.scopes.filter(Boolean) : [];
  const scopesLabel =
    scopes.length > 0
      ? scopes.length > 3
        ? `${scopes.length} ${i18n.nodes.scopes}`
        : `${i18n.nodes.scopes}: ${scopes.join(", ")}`
      : null;
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${entry.host ?? i18n.sessions.unknown}</div>
        <div class="list-sub">${formatPresenceSummary(entry)}</div>
        <div class="chip-row">
          <span class="chip">${mode}</span>
          ${roles.map((role) => html`<span class="chip">${role}</span>`)}
          ${scopesLabel ? html`<span class="chip">${scopesLabel}</span>` : nothing}
          ${entry.platform ? html`<span class="chip">${entry.platform}</span>` : nothing}
          ${entry.deviceFamily
            ? html`<span class="chip">${entry.deviceFamily}</span>`
            : nothing}
          ${entry.modelIdentifier
            ? html`<span class="chip">${entry.modelIdentifier}</span>`
            : nothing}
          ${entry.version ? html`<span class="chip">${entry.version}</span>` : nothing}
        </div>
      </div>
      <div class="list-meta">
        <div>${formatPresenceAge(entry)}</div>
        <div class="muted">${lastInput}</div>
        <div class="muted">${entry.reason ?? ""}</div>
      </div>
    </div>
  `;
}
