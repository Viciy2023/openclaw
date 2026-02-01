import { html, nothing } from "lit";

import { formatMs } from "../format";
import {
  formatCronPayload,
  formatCronSchedule,
  formatCronState,
  formatNextRun,
} from "../presenter";
import type { ChannelUiMetaEntry, CronJob, CronRunLogEntry, CronStatus } from "../types";
import type { CronFormState } from "../ui-types";
import { t } from "../i18n/index.js";

export type CronProps = {
  loading: boolean;
  status: CronStatus | null;
  jobs: CronJob[];
  error: string | null;
  busy: boolean;
  form: CronFormState;
  channels: string[];
  channelLabels?: Record<string, string>;
  channelMeta?: ChannelUiMetaEntry[];
  runsJobId: string | null;
  runs: CronRunLogEntry[];
  onFormChange: (patch: Partial<CronFormState>) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onRun: (job: CronJob) => void;
  onRemove: (job: CronJob) => void;
  onLoadRuns: (jobId: string) => void;
};

function buildChannelOptions(props: CronProps): string[] {
  const options = ["last", ...props.channels.filter(Boolean)];
  const current = props.form.channel?.trim();
  if (current && !options.includes(current)) {
    options.push(current);
  }
  const seen = new Set<string>();
  return options.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function resolveChannelLabel(props: CronProps, channel: string): string {
  if (channel === "last") return "last";
  const meta = props.channelMeta?.find((entry) => entry.id === channel);
  if (meta?.label) return meta.label;
  return props.channelLabels?.[channel] ?? channel;
}

export function renderCron(props: CronProps) {
  const i18n = t();
  const channelOptions = buildChannelOptions(props);
  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">${i18n.cron.scheduler}</div>
        <div class="card-sub">${i18n.cron.schedulerSub}</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">${i18n.common.enabled}</div>
            <div class="stat-value">
              ${props.status
                ? props.status.enabled
                  ? i18n.common.yes
                  : i18n.common.no
                : i18n.common.na}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">${i18n.cron.jobs}</div>
            <div class="stat-value">${props.status?.jobs ?? i18n.common.na}</div>
          </div>
          <div class="stat">
            <div class="stat-label">${i18n.cron.nextWake}</div>
            <div class="stat-value">${formatNextRun(props.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? i18n.common.refreshing : i18n.common.refresh}
          </button>
          ${props.error ? html`<span class="muted">${props.error}</span>` : nothing}
        </div>
      </div>

      <div class="card">
        <div class="card-title">${i18n.cron.newJob}</div>
        <div class="card-sub">${i18n.cron.newJobSub}</div>
        <div class="form-grid" style="margin-top: 16px;">
          <label class="field">
            <span>${i18n.common.name}</span>
            <input .value=${props.form.name} @input=${(e: Event) => props.onFormChange({ name: (e.target as HTMLInputElement).value })} />
          </label>
          <label class="field">
            <span>${i18n.common.description}</span>
            <input .value=${props.form.description} @input=${(e: Event) => props.onFormChange({ description: (e.target as HTMLInputElement).value })} />
          </label>
          <label class="field">
            <span>${i18n.cron.agentId}</span>
            <input .value=${props.form.agentId} @input=${(e: Event) => props.onFormChange({ agentId: (e.target as HTMLInputElement).value })} placeholder="default" />
          </label>
          <label class="field checkbox">
            <span>${i18n.common.enabled}</span>
            <input type="checkbox" .checked=${props.form.enabled} @change=${(e: Event) => props.onFormChange({ enabled: (e.target as HTMLInputElement).checked })} />
          </label>
          <label class="field">
            <span>${i18n.cron.scheduleKind}</span>
            <select .value=${props.form.scheduleKind} @change=${(e: Event) => props.onFormChange({ scheduleKind: (e.target as HTMLSelectElement).value as CronFormState["scheduleKind"] })}>
              <option value="every">${i18n.cron.every}</option>
              <option value="at">${i18n.cron.at}</option>
              <option value="cron">${i18n.cron.cronExpr}</option>
            </select>
          </label>
        </div>
        ${renderScheduleFields(props, i18n)}
        <div class="form-grid" style="margin-top: 12px;">
          <label class="field">
            <span>${i18n.cron.sessionTarget}</span>
            <select .value=${props.form.sessionTarget} @change=${(e: Event) => props.onFormChange({ sessionTarget: (e.target as HTMLSelectElement).value as CronFormState["sessionTarget"] })}>
              <option value="main">${i18n.cron.main}</option>
              <option value="isolated">${i18n.cron.isolated}</option>
            </select>
          </label>
          <label class="field">
            <span>${i18n.cron.wakeMode}</span>
            <select .value=${props.form.wakeMode} @change=${(e: Event) => props.onFormChange({ wakeMode: (e.target as HTMLSelectElement).value as CronFormState["wakeMode"] })}>
              <option value="next-heartbeat">${i18n.cron.nextHeartbeat}</option>
              <option value="now">${i18n.cron.now}</option>
            </select>
          </label>
          <label class="field">
            <span>${i18n.cron.payload}</span>
            <select .value=${props.form.payloadKind} @change=${(e: Event) => props.onFormChange({ payloadKind: (e.target as HTMLSelectElement).value as CronFormState["payloadKind"] })}>
              <option value="systemEvent">${i18n.cron.systemEvent}</option>
              <option value="agentTurn">${i18n.cron.agentTurn}</option>
            </select>
          </label>
        </div>
        <label class="field" style="margin-top: 12px;">
          <span>${props.form.payloadKind === "systemEvent" ? i18n.cron.systemText : i18n.cron.agentMessage}</span>
          <textarea .value=${props.form.payloadText} @input=${(e: Event) => props.onFormChange({ payloadText: (e.target as HTMLTextAreaElement).value })} rows="4"></textarea>
        </label>
        ${props.form.payloadKind === "agentTurn"
          ? html`
              <div class="form-grid" style="margin-top: 12px;">
                <label class="field checkbox">
                  <span>${i18n.cron.deliver}</span>
                  <input type="checkbox" .checked=${props.form.deliver} @change=${(e: Event) => props.onFormChange({ deliver: (e.target as HTMLInputElement).checked })} />
                </label>
                <label class="field">
                  <span>${i18n.cron.channel}</span>
                  <select .value=${props.form.channel || "last"} @change=${(e: Event) => props.onFormChange({ channel: (e.target as HTMLSelectElement).value as CronFormState["channel"] })}>
                    ${channelOptions.map((channel) => html`<option value=${channel}>${resolveChannelLabel(props, channel)}</option>`)}
                  </select>
                </label>
                <label class="field">
                  <span>${i18n.cron.to}</span>
                  <input .value=${props.form.to} @input=${(e: Event) => props.onFormChange({ to: (e.target as HTMLInputElement).value })} placeholder="${i18n.cron.toPlaceholder}" />
                </label>
                <label class="field">
                  <span>${i18n.cron.timeoutSeconds}</span>
                  <input .value=${props.form.timeoutSeconds} @input=${(e: Event) => props.onFormChange({ timeoutSeconds: (e.target as HTMLInputElement).value })} />
                </label>
                ${props.form.sessionTarget === "isolated"
                  ? html`
                      <label class="field">
                        <span>${i18n.cron.postToMainPrefix}</span>
                        <input .value=${props.form.postToMainPrefix} @input=${(e: Event) => props.onFormChange({ postToMainPrefix: (e.target as HTMLInputElement).value })} />
                      </label>
                    `
                  : nothing}
              </div>
            `
          : nothing}
        <div class="row" style="margin-top: 14px;">
          <button class="btn primary" ?disabled=${props.busy} @click=${props.onAdd}>
            ${props.busy ? i18n.common.saving : i18n.cron.addJob}
          </button>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.cron.jobs}</div>
      <div class="card-sub">${i18n.cron.jobsSub}</div>
      ${props.jobs.length === 0
        ? html`<div class="muted" style="margin-top: 12px;">${i18n.cron.noJobsYet}</div>`
        : html`<div class="list" style="margin-top: 12px;">${props.jobs.map((job) => renderJob(job, props, i18n))}</div>`}
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">${i18n.cron.runHistory}</div>
      <div class="card-sub">${i18n.cron.runHistorySub} ${props.runsJobId ?? i18n.cron.selectJobHint}</div>
      ${props.runsJobId == null
        ? html`<div class="muted" style="margin-top: 12px;">${i18n.cron.selectJobToInspect}</div>`
        : props.runs.length === 0
          ? html`<div class="muted" style="margin-top: 12px;">${i18n.cron.noRunsYet}</div>`
          : html`<div class="list" style="margin-top: 12px;">${props.runs.map((entry) => renderRun(entry))}</div>`}
    </section>
  `;
}

function renderScheduleFields(props: CronProps, i18n: ReturnType<typeof t>) {
  const form = props.form;
  if (form.scheduleKind === "at") {
    return html`
      <label class="field" style="margin-top: 12px;">
        <span>${i18n.cron.runAt}</span>
        <input type="datetime-local" .value=${form.scheduleAt} @input=${(e: Event) => props.onFormChange({ scheduleAt: (e.target as HTMLInputElement).value })} />
      </label>
    `;
  }
  if (form.scheduleKind === "every") {
    return html`
      <div class="form-grid" style="margin-top: 12px;">
        <label class="field">
          <span>${i18n.cron.every}</span>
          <input .value=${form.everyAmount} @input=${(e: Event) => props.onFormChange({ everyAmount: (e.target as HTMLInputElement).value })} />
        </label>
        <label class="field">
          <span>${i18n.cron.unit}</span>
          <select .value=${form.everyUnit} @change=${(e: Event) => props.onFormChange({ everyUnit: (e.target as HTMLSelectElement).value as CronFormState["everyUnit"] })}>
            <option value="minutes">${i18n.cron.minutes}</option>
            <option value="hours">${i18n.cron.hours}</option>
            <option value="days">${i18n.cron.days}</option>
          </select>
        </label>
      </div>
    `;
  }
  return html`
    <div class="form-grid" style="margin-top: 12px;">
      <label class="field">
        <span>${i18n.cron.expressionLabel}</span>
        <input .value=${form.cronExpr} @input=${(e: Event) => props.onFormChange({ cronExpr: (e.target as HTMLInputElement).value })} />
      </label>
      <label class="field">
        <span>${i18n.cron.timezoneOptional}</span>
        <input .value=${form.cronTz} @input=${(e: Event) => props.onFormChange({ cronTz: (e.target as HTMLInputElement).value })} />
      </label>
    </div>
  `;
}

function renderJob(job: CronJob, props: CronProps, i18n: ReturnType<typeof t>) {
  const isSelected = props.runsJobId === job.id;
  const itemClass = `list-item list-item-clickable${isSelected ? " list-item-selected" : ""}`;
  return html`
    <div class=${itemClass} @click=${() => props.onLoadRuns(job.id)}>
      <div class="list-main">
        <div class="list-title">${job.name}</div>
        <div class="list-sub">${formatCronSchedule(job)}</div>
        <div class="muted">${formatCronPayload(job)}</div>
        ${job.agentId ? html`<div class="muted">${i18n.agents.agent}: ${job.agentId}</div>` : nothing}
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">${job.enabled ? i18n.common.enabled : i18n.common.disabled}</span>
          <span class="chip">${job.sessionTarget}</span>
          <span class="chip">${job.wakeMode}</span>
        </div>
      </div>
      <div class="list-meta">
        <div>${formatCronState(job)}</div>
        <div class="row" style="justify-content: flex-end; margin-top: 8px;">
          <button class="btn" ?disabled=${props.busy} @click=${(event: Event) => { event.stopPropagation(); props.onToggle(job, !job.enabled); }}>
            ${job.enabled ? i18n.cron.disable : i18n.cron.enable}
          </button>
          <button class="btn" ?disabled=${props.busy} @click=${(event: Event) => { event.stopPropagation(); props.onRun(job); }}>
            ${i18n.cron.run}
          </button>
          <button class="btn" ?disabled=${props.busy} @click=${(event: Event) => { event.stopPropagation(); props.onLoadRuns(job.id); }}>
            ${i18n.cron.runs}
          </button>
          <button class="btn danger" ?disabled=${props.busy} @click=${(event: Event) => { event.stopPropagation(); props.onRemove(job); }}>
            ${i18n.common.remove}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderRun(entry: CronRunLogEntry) {
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">${entry.status}</div>
        <div class="list-sub">${entry.summary ?? ""}</div>
      </div>
      <div class="list-meta">
        <div>${formatMs(entry.ts)}</div>
        <div class="muted">${entry.durationMs ?? 0}ms</div>
        ${entry.error ? html`<div class="muted">${entry.error}</div>` : nothing}
      </div>
    </div>
  `;
}
