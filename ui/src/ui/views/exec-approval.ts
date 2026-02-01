import { html, nothing } from "lit";

import type { AppViewState } from "../app-view-state";
import { t } from "../i18n/index.js";

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function renderMetaRow(label: string, value?: string | null) {
  if (!value) return nothing;
  return html`<div class="exec-approval-meta-row"><span>${label}</span><span>${value}</span></div>`;
}

export function renderExecApprovalPrompt(state: AppViewState) {
  const i18n = t();
  const active = state.execApprovalQueue[0];
  if (!active) return nothing;
  const request = active.request;
  const remainingMs = active.expiresAtMs - Date.now();
  const remaining = remainingMs > 0 ? `${i18n.execApproval.expiresIn} ${formatRemaining(remainingMs)}` : i18n.execApproval.expired;
  const queueCount = state.execApprovalQueue.length;
  return html`
    <div class="exec-approval-overlay" role="dialog" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">${i18n.execApproval.title}</div>
            <div class="exec-approval-sub">${remaining}</div>
          </div>
          ${queueCount > 1
            ? html`<div class="exec-approval-queue">${queueCount} ${i18n.execApproval.pending}</div>`
            : nothing}
        </div>
        <div class="exec-approval-command mono">${request.command}</div>
        <div class="exec-approval-meta">
          ${renderMetaRow(i18n.execApproval.host, request.host)}
          ${renderMetaRow(i18n.execApproval.agent, request.agentId)}
          ${renderMetaRow(i18n.execApproval.session, request.sessionKey)}
          ${renderMetaRow(i18n.execApproval.cwd, request.cwd)}
          ${renderMetaRow(i18n.execApproval.resolved, request.resolvedPath)}
          ${renderMetaRow(i18n.execApproval.security, request.security)}
          ${renderMetaRow(i18n.execApproval.ask, request.ask)}
        </div>
        ${state.execApprovalError
          ? html`<div class="exec-approval-error">${state.execApprovalError}</div>`
          : nothing}
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-once")}
          >
            ${i18n.execApproval.allowOnce}
          </button>
          <button
            class="btn"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-always")}
          >
            ${i18n.execApproval.alwaysAllow}
          </button>
          <button
            class="btn danger"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("deny")}
          >
            ${i18n.execApproval.deny}
          </button>
        </div>
      </div>
    </div>
  `;
}
