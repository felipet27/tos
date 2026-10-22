"use client";

import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

// Shared building blocks of the TOS panel. Colors always come from the --tf-* tokens,
// so Forja (dark) and Cristal (light) keep working.

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/70 px-3 py-2 text-base sm:text-xs text-(color:--tf-white) placeholder:text-(color:--tf-666666) focus:outline-none focus:border-(color:--tf-22C55E-fosforo) focus-visible:ring-1 focus-visible:ring-(color:--tf-22C55E-fosforo) disabled:opacity-50";

export const labelClass = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-(color:--tf-E5A93C-laton)";

export const panelClass = "rounded-xl border border-(color:--tf-B87333-cobre)/35 bg-(color:--tf-07090F-panel)";

export const subPanelClass = "rounded-lg border border-(color:--tf-B87333-cobre)/25 bg-(color:--tf-black)/40";

type Variant = "primary" | "brass" | "outline" | "ghost" | "danger" | "warn" | "cian";
type Size = "xs" | "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo) text-(color:--tf-black) font-extrabold hover:brightness-110",
  brass:
    "border-(color:--tf-E5A93C-laton) bg-gradient-to-r from-(color:--tf-B87333-cobre) via-(color:--tf-E5A93C-laton) to-(color:--tf-B87333-cobre) text-(color:--tf-black) font-bold hover:brightness-110",
  outline: "border-(color:--tf-22C55E-fosforo)/70 bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo) font-bold hover:bg-(color:--tf-22C55E-fosforo)/25",
  ghost: "border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/50 text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white) hover:border-(color:--tf-E5A93C-laton)",
  danger: "border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/60 text-(color:--tf-red-300) font-bold hover:bg-(color:--tf-red-900)/80 hover:text-(color:--tf-white)",
  warn: "border-(color:--tf-E5A93C-laton)/60 bg-(color:--tf-E5A93C-laton)/15 text-(color:--tf-E5A93C-laton) font-bold hover:bg-(color:--tf-E5A93C-laton)/25",
  cian: "border-(color:--tf-22D3EE-cian)/60 bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian) font-bold hover:bg-(color:--tf-22D3EE-cian)/25",
};

const SIZES: Record<Size, string> = {
  xs: "px-2 py-0.5 text-[11px] pointer-coarse:min-h-9",
  sm: "px-2.5 py-1 text-[11px] pointer-coarse:min-h-10",
  md: "px-3.5 py-1.5 text-xs pointer-coarse:min-h-11",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    />
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "danger" | "accent";
}

// Square icon-only button: always has an accessible name and a 44px target on touch screens
export function IconButton({ label, tone = "default", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs transition-colors cursor-pointer pointer-coarse:h-11 pointer-coarse:w-11",
        tone === "danger"
          ? "border-(color:--tf-red-500)/30 bg-(color:--tf-black)/40 text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-red-400) hover:border-(color:--tf-red-500)/60"
          : tone === "accent"
          ? "border-(color:--tf-E5A93C-laton)/50 bg-(color:--tf-E5A93C-laton)/10 text-(color:--tf-E5A93C-laton) hover:bg-(color:--tf-E5A93C-laton)/25"
          : "border-(color:--tf-B87333-cobre)/35 bg-(color:--tf-black)/40 text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white) hover:border-(color:--tf-E5A93C-laton)/70",
        className
      )}
      {...rest}
    />
  );
}

export function Chip({
  active,
  tone = "fosforo",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; tone?: "fosforo" | "laton" | "cian" }) {
  const activeClass =
    tone === "laton"
      ? "border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/20 text-(color:--tf-E5A93C-laton)"
      : tone === "cian"
      ? "border-(color:--tf-22D3EE-cian) bg-(color:--tf-22D3EE-cian)/20 text-(color:--tf-22D3EE-cian)"
      : "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)";
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer pointer-coarse:min-h-10",
        active
          ? activeClass
          : "border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white) hover:border-(color:--tf-B87333-cobre)/70",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

type BadgeTone = "fosforo" | "laton" | "cian" | "danger" | "muted";

const BADGES: Record<BadgeTone, string> = {
  fosforo: "border-(color:--tf-22C55E-fosforo)/40 bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo)",
  laton: "border-(color:--tf-E5A93C-laton)/45 bg-(color:--tf-E5A93C-laton)/15 text-(color:--tf-E5A93C-laton)",
  cian: "border-(color:--tf-22D3EE-cian)/45 bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian)",
  danger: "border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/60 text-(color:--tf-red-400)",
  muted: "border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/50 text-(color:--tf-94A3B8-niebla)",
};

export function Badge({ tone = "muted", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold", BADGES[tone], className)}>
      {children}
    </span>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-(color:--tf-94A3B8-niebla)">{hint}</span>}
    </label>
  );
}

export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-2 border-b border-(color:--tf-B87333-cobre)/20 pb-2", className)}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{children}</h3>
      {aside}
    </div>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-lg border border-dashed border-(color:--tf-B87333-cobre)/25 p-5 text-center text-xs text-(color:--tf-94A3B8-niebla)", className)}>
      {children}
    </div>
  );
}

export function ModuleHeader({ icon, title, subtitle, accent = "fosforo", actions }: { icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; accent?: "fosforo" | "laton" | "cian"; actions?: ReactNode }) {
  const accentClass =
    accent === "laton" ? "text-(color:--tf-E5A93C-laton)" : accent === "cian" ? "text-(color:--tf-22D3EE-cian)" : "text-(color:--tf-22C55E-fosforo)";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(color:--tf-B87333-cobre)/30 pb-2.5">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-bold text-(color:--tf-white) sm:text-lg">
          <span className={accentClass}>{icon ?? "+"}</span> {title}
        </h2>
        {subtitle && <p className="hidden text-[11px] text-(color:--tf-94A3B8-niebla) sm:block">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Plain-text accent-insensitive matching for search boxes
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesQuery(query: string, ...fields: (string | undefined | null)[]): boolean {
  const q = normalizeText(query.trim());
  if (!q) return true;
  return fields.some((f) => f && normalizeText(f).includes(q));
}
