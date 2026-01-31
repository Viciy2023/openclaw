/**
 * Internationalization (i18n) module for OpenClaw Web UI
 *
 * Supports multiple languages with English as the default.
 * Language can be set via:
 * 1. localStorage key 'openclaw-language'
 * 2. setLanguage() function
 * 3. Browser language detection
 */

import { en, type UiTranslations } from "./en.js";
import { zh } from "./zh.js";

export type { UiTranslations };

export type SupportedLanguage = "en" | "zh";

const STORAGE_KEY = "openclaw-language";

const languages: Record<SupportedLanguage, UiTranslations> = {
  en,
  zh,
};

let currentLanguage: SupportedLanguage = "en";
let listeners: Array<(lang: SupportedLanguage) => void> = [];

/**
 * Initialize language from localStorage or browser settings
 */
function initLanguage(): SupportedLanguage {
  // Try localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLanguage(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }

  // Try to detect from browser language
  const browserLang = navigator.language?.toLowerCase() || "";
  if (browserLang.startsWith("zh")) {
    return "zh";
  }

  return "en";
}

/**
 * Check if a language code is valid
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return lang in languages;
}

/**
 * Get the current language
 */
export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Set the current language and persist to localStorage
 */
export function setLanguage(lang: SupportedLanguage): void {
  if (!isValidLanguage(lang)) return;

  currentLanguage = lang;

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage not available
  }

  // Notify listeners
  listeners.forEach((listener) => listener(lang));
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(callback: (lang: SupportedLanguage) => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

/**
 * Get all supported languages with labels
 */
export function getSupportedLanguages(): Array<{ code: SupportedLanguage; label: string; nativeLabel: string }> {
  return [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "zh", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  ];
}

/**
 * Get translations for the current language
 */
export function t(): UiTranslations {
  return languages[currentLanguage];
}

/**
 * Get a specific translation by path
 * Example: getText("nav.chat") returns "Chat" or "聊天"
 */
export function getText(path: string): string {
  const keys = path.split(".");
  let result: unknown = languages[currentLanguage];

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      // Fallback to English if key not found
      result = languages.en;
      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = (result as Record<string, unknown>)[k];
        } else {
          return path; // Return path if not found
        }
      }
      break;
    }
  }

  return typeof result === "string" ? result : path;
}

// Initialize language on module load
currentLanguage = initLanguage();

export { en, zh };
