import { EN } from "./en/index";
import { DEFAULT_LOCALE, Locale } from "./config";

export type TranslateVars = Record<string, string | number>;

// The Spanish text is the key: English comes from the dictionary and anything
// missing (including what users type themselves) is shown as written.
export function translate(locale: Locale, text: string, vars?: TranslateVars): string {
  let out = locale === "en" ? (EN[text] ?? text) : text;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
  }
  return out;
}

export function getTranslator(locale: Locale) {
  return (text: string, vars?: TranslateVars) => translate(locale, text, vars);
}

// Locale used by `t()` in client-only trees (the admin panel). The I18nProvider
// sets it while rendering, before any child reads it.
let runtimeLocale: Locale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: Locale) {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): Locale {
  return runtimeLocale;
}

// BCP 47 tag for dates and times in the current language
export function dateLocale(): string {
  return runtimeLocale === "en" ? "en-US" : "es-CO";
}

export function t(text: string, vars?: TranslateVars): string {
  return translate(runtimeLocale, text, vars);
}

// For stored history entries ("Etapa cambiada a {stage}"): the values are often Spanish
// labels themselves, so they are translated too
export function trv(text: string, vars?: TranslateVars): string {
  if (!vars) return translate(runtimeLocale, text);
  const translated: TranslateVars = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value !== "string") {
      translated[key] = value;
      continue;
    }
    // Lists stored as "nombre, contacto" are translated item by item
    const whole = translate(runtimeLocale, value);
    translated[key] =
      whole === value && value.includes(", ")
        ? value
            .split(", ")
            .map((part) => translate(runtimeLocale, part))
            .join(", ")
        : whole;
  }
  return translate(runtimeLocale, text, translated);
}

// Admin panel translator: also accepts optional values, which render as empty text
export function tr(text: string | null | undefined, vars?: TranslateVars): string {
  return text == null ? "" : translate(runtimeLocale, text, vars);
}
