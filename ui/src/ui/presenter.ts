import { formatAgo, formatDurationMs, formatMs } from "./format";
import type { CronJob, GatewaySessionRow, PresenceEntry } from "./types";
import { t } from "./i18n/index.js";

export function formatPresenceSummary(entry: PresenceEntry): string {
  const i18n = t();
  const host = entry.host ?? i18n.format.unknown;
  const ip = entry.ip ? `(${entry.ip})` : "";
  const mode = entry.mode ?? "";
  const version = entry.version ?? "";
  return `${host} ${ip} ${mode} ${version}`.trim();
}

export function formatPresenceAge(entry: PresenceEntry): string {
  const i18n = t();
  const ts = entry.ts ?? null;
  return ts ? formatAgo(ts) : i18n.format.na;
}

export function formatNextRun(ms?: number | null) {
  const i18n = t();
  if (!ms) return i18n.format.na;
  return `${formatMs(ms)} (${formatAgo(ms)})`;
}

export function formatSessionTokens(row: GatewaySessionRow) {
  const i18n = t();
  if (row.totalTokens == null) return i18n.format.na;
  const total = row.totalTokens ?? 0;
  const ctx = row.contextTokens ?? 0;
  return ctx ? `${total} / ${ctx}` : String(total);
}

export function formatEventPayload(payload: unknown): string {
  if (payload == null) return "";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function formatCronState(job: CronJob) {
  const i18n = t();
  const state = job.state ?? {};
  const next = state.nextRunAtMs ? formatMs(state.nextRunAtMs) : i18n.format.na;
  const last = state.lastRunAtMs ? formatMs(state.lastRunAtMs) : i18n.format.na;
  const status = state.lastStatus ?? i18n.format.na;
  return `${status} · ${i18n.format.next} ${next} · ${i18n.format.last} ${last}`;
}

export function formatCronSchedule(job: CronJob) {
  const i18n = t();
  const s = job.schedule;
  if (s.kind === "at") return `${i18n.format.at} ${formatMs(s.atMs)}`;
  if (s.kind === "every") return `${i18n.format.every} ${formatDurationMs(s.everyMs)}`;
  return `${i18n.format.cron} ${s.expr}${s.tz ? ` (${s.tz})` : ""}`;
}

export function formatCronPayload(job: CronJob) {
  const i18n = t();
  const p = job.payload;
  if (p.kind === "systemEvent") return `${i18n.format.system}: ${p.text}`;
  return `${i18n.format.agent}: ${p.message}`;
}
