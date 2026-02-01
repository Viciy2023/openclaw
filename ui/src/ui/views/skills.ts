import { html, nothing } from "lit";

import { clampText } from "../format";
import type { SkillStatusEntry, SkillStatusReport } from "../types";
import type { SkillMessageMap } from "../controllers/skills";
import { t } from "../i18n/index.js";

export type SkillsProps = {
  loading: boolean;
  report: SkillStatusReport | null;
  error: string | null;
  filter: string;
  edits: Record<string, string>;
  busyKey: string | null;
  messages: SkillMessageMap;
  onFilterChange: (next: string) => void;
  onRefresh: () => void;
  onToggle: (skillKey: string, enabled: boolean) => void;
  onEdit: (skillKey: string, value: string) => void;
  onSaveKey: (skillKey: string) => void;
  onInstall: (skillKey: string, name: string, installId: string) => void;
};

export function renderSkills(props: SkillsProps) {
  const i18n = t();
  const skills = props.report?.skills ?? [];
  const filter = props.filter.trim().toLowerCase();
  const filtered = filter
    ? skills.filter((skill) =>
        [skill.name, skill.description, skill.source]
          .join(" ")
          .toLowerCase()
          .includes(filter),
      )
    : skills;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${i18n.skills.title}</div>
          <div class="card-sub">${i18n.skills.subtitle}</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? i18n.common.loadingEllipsis : i18n.common.refresh}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field" style="flex: 1;">
          <span>${i18n.common.filter}</span>
          <input
            .value=${props.filter}
            @input=${(e: Event) =>
              props.onFilterChange((e.target as HTMLInputElement).value)}
            placeholder="${i18n.skills.searchSkills}"
          />
        </label>
        <div class="muted">${filtered.length} ${i18n.common.shown}</div>
      </div>

      ${props.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
        : nothing}

      ${filtered.length === 0
        ? html`<div class="muted" style="margin-top: 16px;">${i18n.skills.noSkillsFound}</div>`
        : html`
            <div class="list" style="margin-top: 16px;">
              ${filtered.map((skill) => renderSkill(skill, props, i18n))}
            </div>
          `}
    </section>
  `;
}

function renderSkill(skill: SkillStatusEntry, props: SkillsProps, i18n: ReturnType<typeof t>) {
  const busy = props.busyKey === skill.skillKey;
  const apiKey = props.edits[skill.skillKey] ?? "";
  const message = props.messages[skill.skillKey] ?? null;
  const canInstall =
    skill.install.length > 0 && skill.missing.bins.length > 0;
  const missing = [
    ...skill.missing.bins.map((b) => `bin:${b}`),
    ...skill.missing.env.map((e) => `env:${e}`),
    ...skill.missing.config.map((c) => `config:${c}`),
    ...skill.missing.os.map((o) => `os:${o}`),
  ];
  const reasons: string[] = [];
  if (skill.disabled) reasons.push(i18n.common.disabled);
  if (skill.blockedByAllowlist) reasons.push(i18n.skills.blockedByAllowlist);
  return html`
    <div class="list-item">
      <div class="list-main">
        <div class="list-title">
          ${skill.emoji ? `${skill.emoji} ` : ""}${skill.name}
        </div>
        <div class="list-sub">${clampText(skill.description, 140)}</div>
        <div class="chip-row" style="margin-top: 6px;">
          <span class="chip">${skill.source}</span>
          <span class="chip ${skill.eligible ? "chip-ok" : "chip-warn"}">
            ${skill.eligible ? i18n.skills.eligible : i18n.skills.blocked}
          </span>
          ${skill.disabled ? html`<span class="chip chip-warn">${i18n.common.disabled}</span>` : nothing}
        </div>
        ${missing.length > 0
          ? html`
              <div class="muted" style="margin-top: 6px;">
                ${i18n.skills.missing}: ${missing.join(", ")}
              </div>
            `
          : nothing}
        ${reasons.length > 0
          ? html`
              <div class="muted" style="margin-top: 6px;">
                ${i18n.skills.reason}: ${reasons.join(", ")}
              </div>
            `
          : nothing}
      </div>
      <div class="list-meta">
        <div class="row" style="justify-content: flex-end; flex-wrap: wrap;">
          <button
            class="btn"
            ?disabled=${busy}
            @click=${() => props.onToggle(skill.skillKey, skill.disabled)}
          >
            ${skill.disabled ? i18n.cron.enable : i18n.cron.disable}
          </button>
          ${canInstall
            ? html`<button
                class="btn"
                ?disabled=${busy}
                @click=${() =>
                  props.onInstall(skill.skillKey, skill.name, skill.install[0].id)}
              >
                ${busy ? i18n.skills.installing : skill.install[0].label}
              </button>`
            : nothing}
        </div>
        ${message
          ? html`<div
              class="muted"
              style="margin-top: 8px; color: ${
                message.kind === "error"
                  ? "var(--danger-color, #d14343)"
                  : "var(--success-color, #0a7f5a)"
              };"
            >
              ${message.message}
            </div>`
          : nothing}
        ${skill.primaryEnv
          ? html`
              <div class="field" style="margin-top: 10px;">
                <span>${i18n.skills.apiKey}</span>
                <input
                  type="password"
                  .value=${apiKey}
                  @input=${(e: Event) =>
                    props.onEdit(skill.skillKey, (e.target as HTMLInputElement).value)}
                />
              </div>
              <button
                class="btn primary"
                style="margin-top: 8px;"
                ?disabled=${busy}
                @click=${() => props.onSaveKey(skill.skillKey)}
              >
                ${i18n.skills.saveKey}
              </button>
            `
          : nothing}
      </div>
    </div>
  `;
}
