import { html, nothing } from "lit";

import { formatEventPayload } from "../presenter";
import type { EventLogEntry } from "../app-events";
import { t } from "../i18n/index.js";

export type DebugProps = {
  loading: boolean;
  status: Record<string, unknown> | null;
  health: Record<string, unknown> | null;
  models: unknown[];
  heartbeat: unknown;
  eventLog: EventLogEntry[];
  callMethod: string;
  callParams: string;
  callResult: string | null;
  callError: string | null;
  onCallMethodChange: (next: string) => void;
  onCallParamsChange: (next: string) => void;
  onRefresh: () => void;
  onCall: () => void;
};

export function renderDebug(props: DebugProps) {
  const i18n = t();
  const securityAudit =
    props.status && typeof props.status === "object"
      ? (props.status as { securityAudit?: { summary?: Record<string, number> } }).securityAudit
      : null;
  const securitySummary = securityAudit?.summary ?? null;
  const critical = securitySummary?.critical ?? 0;
  const warn = securitySummary?.warn ?? 0;
  const info = securitySummary?.info ?? 0;
  const securityTone = critical > 0 ? "danger" : warn > 0 ? "warn" : "success";
  const securityLabel =
    critical > 0
      ? `${critical} ${i18n.common.error}`
      : warn > 0
        ? `${warn} ${i18n.common.warning}`
        : i18n.health.ok;

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">${i18n.overview.snapshot}</div>
            <div class="card-sub">${i18n.debug.status}, ${i18n.debug.health}, ${i18n.debug.heartbeat}</div>
          </div>
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? i18n.common.refreshing : i18n.common.refresh}
          </button>
        </div>
        <div class="stack" style="margin-top: 12px;">
          <div>
            <div class="muted">${i18n.debug.status}</div>
            ${securitySummary
              ? html`<div class="callout ${securityTone}" style="margin-top: 8px;">
                  ${i18n.nodes.security}: ${securityLabel}${info > 0 ? ` · ${info} ${i18n.common.info}` : ""}
                </div>`
              : nothing}
            <pre class="code-block">${JSON.stringify(props.status ?? {}, null, 2)}</pre>
          </div>
          <div>
            <div class="muted">${i18n.debug.health}</div>
            <pre class="code-block">${JSON.stringify(props.health ?? {}, null, 2)}</pre>
          </div>
          <div>
            <div class="muted">${i18n.debug.heartbeat}</div>
            <pre class="code-block">${JSON.stringify(props.heartbeat ?? {}, null, 2)}</pre>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">${i18n.debug.callMethod}</div>
        <div class="card-sub">${i18n.debug.params}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${i18n.debug.callMethod}</span>
            <input
              .value=${props.callMethod}
              @input=${(e: Event) =>
                props.onCallMethodChange((e.target as HTMLInputElement).value)}
              placeholder="system-presence"
            />
          </label>
          <label class="field">
            <span>${i18n.debug.params} (JSON)</span>
            <textarea
              .value=${props.callParams}
              @input=${(e: Event) =>
                props.onCallParamsChange((e.target as HTMLTextAreaElement).value)}
              rows="6"
            ></textarea>
          </label>
        </div>
        <div class="row" style="margin-top: 12px;">
          <button class="btn primary" @click=${props.onCall}>${i18n.debug.callMethod}</button>
        </div>
        ${props.callError
          ? html`<div class="callout danger" style="margin-top: 12px;">
              ${props.callError}
            </div>`
          : nothing}
        ${props.callResult
          ? html`<pre class="code-block" style="margin-top: 12px;">${props.callResult}</pre>`
          : nothing}
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.debug.models}</div>
      <div class="card-sub">${i18n.config.models}</div>
      <pre class="code-block" style="margin-top: 12px;">${JSON.stringify(
        props.models ?? [],
        null,
        2,
      )}</pre>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.logs.title}</div>
      <div class="card-sub">${i18n.logs.title}</div>
      ${props.eventLog.length === 0
        ? html`<div class="muted" style="margin-top: 12px;">${i18n.common.noData}</div>`
        : html`
            <div class="list" style="margin-top: 12px;">
              ${props.eventLog.map(
                (evt) => html`
                  <div class="list-item">
                    <div class="list-main">
                      <div class="list-title">${evt.event}</div>
                      <div class="list-sub">${new Date(evt.ts).toLocaleTimeString()}</div>
                    </div>
                    <div class="list-meta">
                      <pre class="code-block">${formatEventPayload(evt.payload)}</pre>
                    </div>
                  </div>
                `,
              )}
            </div>
          `}
    </section>
  `;
}
