/**
 * Nostr Profile Edit Form
 *
 * Provides UI for editing and publishing Nostr profile (kind:0).
 */

import { html, nothing, type TemplateResult } from "lit";

import type { NostrProfile as NostrProfileType } from "../types";
import { t } from "../i18n/index.js";

// ============================================================================
// Types
// ============================================================================

export interface NostrProfileFormState {
  /** Current form values */
  values: NostrProfileType;
  /** Original values for dirty detection */
  original: NostrProfileType;
  /** Whether the form is currently submitting */
  saving: boolean;
  /** Whether import is in progress */
  importing: boolean;
  /** Last error message */
  error: string | null;
  /** Last success message */
  success: string | null;
  /** Validation errors per field */
  fieldErrors: Record<string, string>;
  /** Whether to show advanced fields */
  showAdvanced: boolean;
}

export interface NostrProfileFormCallbacks {
  /** Called when a field value changes */
  onFieldChange: (field: keyof NostrProfileType, value: string) => void;
  /** Called when save is clicked */
  onSave: () => void;
  /** Called when import is clicked */
  onImport: () => void;
  /** Called when cancel is clicked */
  onCancel: () => void;
  /** Called when toggle advanced is clicked */
  onToggleAdvanced: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function isFormDirty(state: NostrProfileFormState): boolean {
  const { values, original } = state;
  return (
    values.name !== original.name ||
    values.displayName !== original.displayName ||
    values.about !== original.about ||
    values.picture !== original.picture ||
    values.banner !== original.banner ||
    values.website !== original.website ||
    values.nip05 !== original.nip05 ||
    values.lud16 !== original.lud16
  );
}

// ============================================================================
// Form Rendering
// ============================================================================

export function renderNostrProfileForm(params: {
  state: NostrProfileFormState;
  callbacks: NostrProfileFormCallbacks;
  accountId: string;
}): TemplateResult {
  const i18n = t();
  const { state, callbacks, accountId } = params;
  const isDirty = isFormDirty(state);

  const renderField = (
    field: keyof NostrProfileType,
    label: string,
    opts: {
      type?: "text" | "url" | "textarea";
      placeholder?: string;
      maxLength?: number;
      help?: string;
    } = {}
  ) => {
    const { type = "text", placeholder, maxLength, help } = opts;
    const value = state.values[field] ?? "";
    const error = state.fieldErrors[field];

    const inputId = `nostr-profile-${field}`;

    if (type === "textarea") {
      return html`
        <div class="form-field" style="margin-bottom: 12px;">
          <label for="${inputId}" style="display: block; margin-bottom: 4px; font-weight: 500;">
            ${label}
          </label>
          <textarea
            id="${inputId}"
            .value=${value}
            placeholder=${placeholder ?? ""}
            maxlength=${maxLength ?? 2000}
            rows="3"
            style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; resize: vertical; font-family: inherit;"
            @input=${(e: InputEvent) => {
              const target = e.target as HTMLTextAreaElement;
              callbacks.onFieldChange(field, target.value);
            }}
            ?disabled=${state.saving}
          ></textarea>
          ${help ? html`<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${help}</div>` : nothing}
          ${error ? html`<div style="font-size: 12px; color: var(--danger-color); margin-top: 2px;">${error}</div>` : nothing}
        </div>
      `;
    }

    return html`
      <div class="form-field" style="margin-bottom: 12px;">
        <label for="${inputId}" style="display: block; margin-bottom: 4px; font-weight: 500;">
          ${label}
        </label>
        <input
          id="${inputId}"
          type=${type}
          .value=${value}
          placeholder=${placeholder ?? ""}
          maxlength=${maxLength ?? 256}
          style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;"
          @input=${(e: InputEvent) => {
            const target = e.target as HTMLInputElement;
            callbacks.onFieldChange(field, target.value);
          }}
          ?disabled=${state.saving}
        />
        ${help ? html`<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${help}</div>` : nothing}
        ${error ? html`<div style="font-size: 12px; color: var(--danger-color); margin-top: 2px;">${error}</div>` : nothing}
      </div>
    `;
  };

  const renderPicturePreview = () => {
    const picture = state.values.picture;
    if (!picture) return nothing;

    return html`
      <div style="margin-bottom: 12px;">
        <img
          src=${picture}
          alt="Profile picture preview"
          style="max-width: 80px; max-height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);"
          @error=${(e: Event) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
          }}
          @load=${(e: Event) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "block";
          }}
        />
      </div>
    `;
  };

  return html`
    <div class="nostr-profile-form" style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-top: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="font-weight: 600; font-size: 16px;">${i18n.nostrProfile.editProfile}</div>
        <div style="font-size: 12px; color: var(--text-muted);">${i18n.nostrProfile.account}: ${accountId}</div>
      </div>

      ${state.error
        ? html`<div class="callout danger" style="margin-bottom: 12px;">${state.error}</div>`
        : nothing}

      ${state.success
        ? html`<div class="callout success" style="margin-bottom: 12px;">${state.success}</div>`
        : nothing}

      ${renderPicturePreview()}

      ${renderField("name", i18n.nostrProfile.username, {
        placeholder: i18n.nostrProfile.usernamePlaceholder,
        maxLength: 256,
        help: i18n.nostrProfile.usernameHelp,
      })}

      ${renderField("displayName", i18n.nostrProfile.displayName, {
        placeholder: i18n.nostrProfile.displayNamePlaceholder,
        maxLength: 256,
        help: i18n.nostrProfile.displayNameHelp,
      })}

      ${renderField("about", i18n.nostrProfile.bio, {
        type: "textarea",
        placeholder: i18n.nostrProfile.bioPlaceholder,
        maxLength: 2000,
        help: i18n.nostrProfile.bioHelp,
      })}

      ${renderField("picture", i18n.nostrProfile.avatarUrl, {
        type: "url",
        placeholder: i18n.nostrProfile.avatarUrlPlaceholder,
        help: i18n.nostrProfile.avatarUrlHelp,
      })}

      ${state.showAdvanced
        ? html`
            <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
              <div style="font-weight: 500; margin-bottom: 12px; color: var(--text-muted);">${i18n.nostrProfile.advanced}</div>

              ${renderField("banner", i18n.nostrProfile.bannerUrl, {
                type: "url",
                placeholder: i18n.nostrProfile.bannerUrlPlaceholder,
                help: i18n.nostrProfile.bannerUrlHelp,
              })}

              ${renderField("website", i18n.nostrProfile.website, {
                type: "url",
                placeholder: i18n.nostrProfile.websitePlaceholder,
                help: i18n.nostrProfile.websiteHelp,
              })}

              ${renderField("nip05", i18n.nostrProfile.nip05, {
                placeholder: i18n.nostrProfile.nip05Placeholder,
                help: i18n.nostrProfile.nip05Help,
              })}

              ${renderField("lud16", i18n.nostrProfile.lightningAddress, {
                placeholder: i18n.nostrProfile.lightningAddressPlaceholder,
                help: i18n.nostrProfile.lightningAddressHelp,
              })}
            </div>
          `
        : nothing}

      <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
        <button
          class="btn primary"
          @click=${callbacks.onSave}
          ?disabled=${state.saving || !isDirty}
        >
          ${state.saving ? i18n.nostrProfile.saving : i18n.nostrProfile.savePublish}
        </button>

        <button
          class="btn"
          @click=${callbacks.onImport}
          ?disabled=${state.importing || state.saving}
        >
          ${state.importing ? i18n.nostrProfile.importing : i18n.nostrProfile.importFromRelays}
        </button>

        <button
          class="btn"
          @click=${callbacks.onToggleAdvanced}
        >
          ${state.showAdvanced ? i18n.nostrProfile.hideAdvanced : i18n.nostrProfile.showAdvanced}
        </button>

        <button
          class="btn"
          @click=${callbacks.onCancel}
          ?disabled=${state.saving}
        >
          ${i18n.nostrProfile.cancel}
        </button>
      </div>

      ${isDirty
        ? html`<div style="font-size: 12px; color: var(--warning-color); margin-top: 8px;">
            ${i18n.nostrProfile.unsavedChanges}
          </div>`
        : nothing}
    </div>
  `;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create initial form state from existing profile
 */
export function createNostrProfileFormState(
  profile: NostrProfileType | undefined
): NostrProfileFormState {
  const values: NostrProfileType = {
    name: profile?.name ?? "",
    displayName: profile?.displayName ?? "",
    about: profile?.about ?? "",
    picture: profile?.picture ?? "",
    banner: profile?.banner ?? "",
    website: profile?.website ?? "",
    nip05: profile?.nip05 ?? "",
    lud16: profile?.lud16 ?? "",
  };

  return {
    values,
    original: { ...values },
    saving: false,
    importing: false,
    error: null,
    success: null,
    fieldErrors: {},
    showAdvanced: Boolean(
      profile?.banner || profile?.website || profile?.nip05 || profile?.lud16
    ),
  };
}
