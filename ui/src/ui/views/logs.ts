import { html, nothing } from "lit";

import type { LogEntry, LogLevel } from "../types";
import { t } from "../i18n/index.js";

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

export type LogsProps = {
  loading: boolean;
  error: string | null;
  file: string | null;
  entries: LogEntry[];
  filterText: string;
  levelFilters: Record<LogLevel, boolean>;
  autoFollow: boolean;
  truncated: boolean;
  onFilterTextChange: (next: string) => void;
  onLevelToggle: (level: LogLevel, enabled: boolean) => void;
  onToggleAutoFollow: (next: boolean) => void;
  onRefresh: () => void;
  onExport: (lines: string[], label: string) => void;
  onScroll: (event: Event) => void;
};

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

function matchesFilter(entry: LogEntry, needle: string) {
  if (!needle) return true;
  const haystack = [entry.message, entry.subsystem, entry.raw]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function renderLogs(props: LogsProps) {
  const i18n = t();
  const needle = props.filterText.trim().toLowerCase();
  const levelFiltered = LEVELS.some((level) => !props.levelFilters[level]);
  const filtered = props.entries.filter((entry) => {
    if (entry.level && !props.levelFilters[entry.level]) return false;
    return matchesFilter(entry, needle);
  });
  const exportLabel = needle || levelFiltered ? i18n.common.filter : i18n.common.shown;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${i18n.logs.title}</div>
          <div class="card-sub">${i18n.logs.title} (JSONL)</div>
        </div>
        <div class="row" style="gap: 8px;">
          <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? i18n.common.loadingEllipsis : i18n.common.refresh}
          </button>
          <button
            class="btn"
            ?disabled=${filtered.length === 0}
            @click=${() => props.onExport(filtered.map((entry) => entry.raw), exportLabel)}
          >
            ${i18n.logs.export} ${exportLabel}
          </button>
        </div>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="min-width: 220px;">
          <span>${i18n.common.filter}</span>
          <input
            .value=${props.filterText}
            @input=${(e: Event) =>
              props.onFilterTextChange((e.target as HTMLInputElement).value)}
            placeholder="${i18n.logs.filterText}"
          />
        </label>
        <label class="field checkbox">
          <span>${i18n.logs.autoFollow}</span>
          <input
            type="checkbox"
            .checked=${props.autoFollow}
            @change=${(e: Event) =>
              props.onToggleAutoFollow((e.target as HTMLInputElement).checked)}
          />
        </label>
      </div>

      <div class="chip-row" style="margin-top: 12px;">
        ${LEVELS.map(
          (level) => html`
            <label class="chip log-chip ${level}">
              <input
                type="checkbox"
                .checked=${props.levelFilters[level]}
                @change=${(e: Event) =>
                  props.onLevelToggle(level, (e.target as HTMLInputElement).checked)}
              />
              <span>${level}</span>
            </label>
          `,
        )}
      </div>

      ${props.file
        ? html`<div class="muted" style="margin-top: 10px;">${i18n.common.store}: ${props.file}</div>`
        : nothing}
      ${props.truncated
        ? html`<div class="callout" style="margin-top: 10px;">
            ${i18n.common.noData}
          </div>`
        : nothing}
      ${props.error
        ? html`<div class="callout danger" style="margin-top: 10px;">${props.error}</div>`
        : nothing}

      <div class="log-stream" style="margin-top: 12px;" @scroll=${props.onScroll}>
        ${filtered.length === 0
          ? html`<div class="muted" style="padding: 12px;">${i18n.common.noData}</div>`
          : filtered.map(
              (entry) => html`
                <div class="log-row">
                  <div class="log-time mono">${formatTime(entry.time)}</div>
                  <div class="log-level ${entry.level ?? ""}">${entry.level ?? ""}</div>
                  <div class="log-subsystem mono">${entry.subsystem ?? ""}</div>
                  <div class="log-message mono">${entry.message ?? entry.raw}</div>
                </div>
              `,
            )}
      </div>
    </section>
  `;
}
