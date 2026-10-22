"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LOCALE_STORAGE_KEY, Locale, localizePath } from "./config";
import { TranslateVars, setRuntimeLocale, translate } from "./translate";

interface I18nValue {
  lang: Locale;
  t: (text: string, vars?: TranslateVars) => string;
  switchLang: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ lang: initialLang, children }: { lang: Locale; children: React.ReactNode }) {
  const [lang, setLang] = useState<Locale>(initialLang);

  // Synchronously update the global runtime locale for tr() / t() calls
  setRuntimeLocale(lang);

  // Sync if initialLang prop ever changes from the server
  useEffect(() => {
    setLang(initialLang);
    setRuntimeLocale(initialLang);
  }, [initialLang]);

  // Support browser Back/Forward buttons without full page reloads
  useEffect(() => {
    function handlePopState() {
      const match = window.location.pathname.match(/^\/(es|en)(?=\/|$)/);
      if (match && (match[1] === "es" || match[1] === "en") && match[1] !== lang) {
        const next = match[1] as Locale;
        setRuntimeLocale(next);
        setLang(next);
        if (typeof document !== "undefined") {
          document.documentElement.lang = next;
        }
        try {
          localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch {
          // Ignore storage errors
        }
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [lang]);

  function switchLang(next: Locale) {
    if (next === lang) return;

    // 1. Immediately update runtime locale
    setRuntimeLocale(next);

    // 2. Persist in storage and HTML lang attribute
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }

    // 3. Update the browser URL instantly without triggering Next.js RSC server compilation/reload
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const nextPath = localizePath(currentPath, next);
      const newUrl = `${nextPath}${window.location.search}${window.location.hash}`;
      window.history.replaceState(null, "", newUrl);
    }

    // 4. Trigger instantaneous React re-render of the entire component tree
    setLang(next);
  }

  return (
    <I18nContext.Provider value={{ lang, t: (text, vars) => translate(lang, text, vars), switchLang }}>
      <div key={lang} style={{ display: "contents" }}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
