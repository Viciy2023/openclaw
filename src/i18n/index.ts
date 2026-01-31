/**
 * Internationalization (i18n) module for OpenClaw
 *
 * Supports multiple languages with English as the default.
 * Language can be set via:
 * 1. OPENCLAW_LANG environment variable
 * 2. setLanguage() function
 */

import { en, type Translations } from "./en.js";
import { zh } from "./zh.js";

export type { Translations };

export type SupportedLanguage = "en" | "zh";

const languages: Record<SupportedLanguage, Translations> = {
  en,
  zh,
};

let currentLanguage: SupportedLanguage = "en";

/**
 * Initialize language from environment variable
 */
function initLanguage(): SupportedLanguage {
  const envLang = process.env.OPENCLAW_LANG?.toLowerCase();
  if (envLang && isValidLanguage(envLang)) {
    return envLang;
  }

  // Try to detect from system locale
  const locale = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || "";
  if (locale.startsWith("zh")) {
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
 * Set the current language
 */
export function setLanguage(lang: SupportedLanguage): void {
  if (isValidLanguage(lang)) {
    currentLanguage = lang;
  }
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return Object.keys(languages) as SupportedLanguage[];
}

/**
 * Get translations for the current language
 */
export function t(): Translations {
  return languages[currentLanguage];
}

/**
 * Get a specific translation by path
 * Example: getText("commands.help") returns "Show slash command help"
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
