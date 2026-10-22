"use client";

import { LOCALES } from "./config";
import { useI18n } from "./I18nProvider";

// ES | EN pill. `className` lets each surface (site header, admin bar) restyle it.
export function LanguageSwitcher({
  className = "",
  activeClassName = "bg-(color:--tf-22C55E-fosforo)/25 text-(color:--tf-22C55E-fosforo)",
  idleClassName = "text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)",
}: {
  className?: string;
  activeClassName?: string;
  idleClassName?: string;
}) {
  const { lang, switchLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("Idioma")} className={`flex items-center gap-0.5 rounded-full p-0.5 ${className}`}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={lang === locale}
          title={locale === "es" ? "Español" : "English"}
          onClick={() => switchLang(locale)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
            lang === locale ? activeClassName : idleClassName
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
