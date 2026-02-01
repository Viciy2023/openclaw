import { html, nothing } from "lit";

import type { AppViewState } from "../app-view-state";
import { t } from "../i18n/index.js";

export function renderGatewayUrlConfirmation(state: AppViewState) {
  const i18n = t();
  const { pendingGatewayUrl } = state;
  if (!pendingGatewayUrl) return nothing;

  return html`
    <div class="exec-approval-overlay" role="dialog" aria-modal="true" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">${i18n.gatewayUrl.title}</div>
            <div class="exec-approval-sub">${i18n.gatewayUrl.subtitle}</div>
          </div>
        </div>
        <div class="exec-approval-command mono">${pendingGatewayUrl}</div>
        <div class="callout danger" style="margin-top: 12px;">
          ${i18n.gatewayUrl.warning}
        </div>
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            @click=${() => state.handleGatewayUrlConfirm()}
          >
            ${i18n.gatewayUrl.confirm}
          </button>
          <button
            class="btn"
            @click=${() => state.handleGatewayUrlCancel()}
          >
            ${i18n.gatewayUrl.cancel}
          </button>
        </div>
      </div>
    </div>
  `;
}
