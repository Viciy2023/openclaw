import { stripReasoningTagsFromText } from "../../../src/shared/text/reasoning-tags.js";
import { t } from "./i18n/index.js";

export function formatMs(ms?: number | null): string {
  const i18n = t();
  if (!ms && ms !== 0) return i18n.format.na;
  return new Date(ms).toLocaleString();
}

export function formatAgo(ms?: number | null): string {
  const i18n = t();
  if (!ms && ms !== 0) return i18n.format.na;
  const diff = Date.now() - ms;
  if (diff < 0) return i18n.format.justNow;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return i18n.format.secondsAgo.replace("{n}", String(sec));
  const min = Math.round(sec / 60);
  if (min < 60) return i18n.format.minutesAgo.replace("{n}", String(min));
  const hr = Math.round(min / 60);
  if (hr < 48) return i18n.format.hoursAgo.replace("{n}", String(hr));
  const day = Math.round(hr / 24);
  return i18n.format.daysAgo.replace("{n}", String(day));
}

export function formatDurationMs(ms?: number | null): string {
  const i18n = t();
  if (!ms && ms !== 0) return i18n.format.na;
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

export function formatList(values?: Array<string | null | undefined>): string {
  const i18n = t();
  if (!values || values.length === 0) return i18n.format.none;
  return values.filter((v): v is string => Boolean(v && v.trim())).join(", ");
}

export function clampText(value: string, max = 120): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function truncateText(value: string, max: number): {
  text: string;
  truncated: boolean;
  total: number;
} {
  if (value.length <= max) {
    return { text: value, truncated: false, total: value.length };
  }
  return {
    text: value.slice(0, Math.max(0, max)),
    truncated: true,
    total: value.length,
  };
}

export function toNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseList(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function stripThinkingTags(value: string): string {
  return stripReasoningTagsFromText(value, { mode: "preserve", trim: "start" });
}
