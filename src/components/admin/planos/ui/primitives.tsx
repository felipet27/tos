import React, { useEffect } from "react";
import { Icon, IconName } from "./icons";

import { tr } from "@/i18n/translate";
// Shared look of every floating panel of the board
export const ISLAND =
  "rounded-xl border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07080E)/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.5)]";

export const ACTIVE = "bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo) shadow-[inset_0_0_0_1px_rgba(34,197,94,0.5)]";
export const IDLE = "text-(color:--tf-C0C0C0-plata) hover:bg-(color:--tf-white)/5 hover:text-(color:--tf-white)";

export function IconButton({
  icon,
  title,
  active = false,
  disabled = false,
  onClick,
  size = "md",
  filled = false,
  className = "",
  children,
}: {
  icon?: IconName;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  filled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={tr(title)}
      aria-label={tr(title)}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9"
      } ${active ? ACTIVE : IDLE} ${className}`}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} filled={filled} />}
      {children}
    </button>
  );
}

export function Divider({ vertical = false }: { vertical?: boolean }) {
  return vertical ? (
    <div className="mx-1 h-6 w-px shrink-0 bg-(color:--tf-B87333-cobre)/30" />
  ) : (
    <div className="my-1 h-px bg-(color:--tf-B87333-cobre)/25" />
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/40 px-1 font-mono text-[10px] text-(color:--tf-E5A93C-laton)">
      {children}
    </kbd>
  );
}

export function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  active,
  highlight,
  danger,
  disabled,
  badge,
  trailing,
}: {
  icon?: IconName;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  active?: boolean;
  highlight?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-(color:--tf-white)/5 disabled:pointer-events-none disabled:opacity-35 ${
        danger ? "text-(color:--tf-red-400)" : highlight ? "font-semibold text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white)"
      }`}
    >
      {icon && <Icon name={icon} size={16} className="shrink-0" />}
      <span className="flex-1 truncate">{tr(label)}</span>
      {active !== undefined && (
        <span className={`shrink-0 ${active ? "text-(color:--tf-22C55E-fosforo)" : "text-transparent"}`}>
          <Icon name="check" size={14} />
        </span>
      )}
      {badge && (
        <span className="shrink-0 rounded bg-(color:--tf-22D3EE-cian)/20 px-1 font-mono text-[9px] font-bold text-(color:--tf-22D3EE-cian)">
          {tr(badge)}
        </span>
      )}
      {shortcut && <span className="shrink-0 font-mono text-[11px] text-(color:--tf-E5A93C-laton)/70">{tr(shortcut)}</span>}
      {trailing}
    </button>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">
      {children}
    </div>
  );
}

// Closes a popover on Escape without letting the key reach the admin panel (which would close itself)
export function useEscapeToClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, onClose]);
}

export function Dialog({
  title,
  icon,
  onClose,
  children,
  width = "max-w-xl",
}: {
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEscapeToClose(true, onClose);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(color:--tf-black)/70 p-4 backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`${ISLAND} flex max-h-[88vh] w-full ${width} flex-col p-5 font-sans text-(color:--tf-C0C0C0-plata)`}>
        <div className="mb-4 flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/30 pb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-(color:--tf-white)">
            {icon && (
              <span className="text-(color:--tf-E5A93C-laton)">
                <Icon name={icon} size={18} />
              </span>
            )}
            {tr(title)}
          </h3>
          <IconButton icon="close" title={tr("Cerrar")} size="sm" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
