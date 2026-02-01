import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { icons } from "../icons";
import { toSanitizedMarkdownHtml } from "../markdown";
import { t } from "../i18n/index.js";

export type MarkdownSidebarProps = {
  content: string | null;
  error: string | null;
  onClose: () => void;
  onViewRawText: () => void;
};

export function renderMarkdownSidebar(props: MarkdownSidebarProps) {
  const i18n = t();
  return html`
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <div class="sidebar-title">${i18n.sidebar.toolOutput}</div>
        <button @click=${props.onClose} class="btn" title="${i18n.sidebar.closeSidebar}">
          ${icons.x}
        </button>
      </div>
      <div class="sidebar-content">
        ${props.error
          ? html`
              <div class="callout danger">${props.error}</div>
              <button @click=${props.onViewRawText} class="btn" style="margin-top: 12px;">
                ${i18n.sidebar.viewRawText}
              </button>
            `
          : props.content
            ? html`<div class="sidebar-markdown">${unsafeHTML(toSanitizedMarkdownHtml(props.content))}</div>`
            : html`<div class="muted">${i18n.sidebar.noContent}</div>`}
      </div>
    </div>
  `;
}
