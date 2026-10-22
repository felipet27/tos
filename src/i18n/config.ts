export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

// Remembers the visitor's explicit choice from the ES/EN switcher
export const LOCALE_STORAGE_KEY = "twoffactor_lang";

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

// Swaps (or adds) the locale prefix of a pathname: /es/hablemos -> /en/hablemos
export function localizePath(pathname: string, locale: Locale): string {
  const rest = pathname.replace(/^\/(es|en)(?=\/|$)/, "");
  return `/${locale}${rest === "/" ? "" : rest}`;
}
