"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { tr } from "@/i18n/translate";
import { IconButton, cx } from "./kit";

type Tone = "laton" | "fosforo" | "cian" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const TONES: Record<Tone, string> = {
  laton: "sm:border-(color:--tf-E5A93C-laton)/70",
  fosforo: "sm:border-(color:--tf-22C55E-fosforo)/80",
  cian: "sm:border-(color:--tf-22D3EE-cian)/80",
  danger: "sm:border-(color:--tf-red-500)/70",
};

const SIZES: Record<Size, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, topmost last: Esc and focus trapping only apply to the top one
const openStack: string[] = [];

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  size?: Size;
  footer?: ReactNode;
  children: ReactNode;
  /** Set to false while a form has unsaved work that must not be lost to a stray click */
  dismissible?: boolean;
  bodyClassName?: string;
}

// The one dialog of TOS: Esc closes, focus stays inside, the body scrolls and on
// phones it opens as a bottom sheet
export function Modal(props: ModalProps) {
  if (!props.open) return null;
  return <ModalInner {...props} />;
}

function ModalInner({ onClose, title, subtitle, icon, tone = "laton", size = "md", footer, children, dismissible = true, bodyClassName }: ModalProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    openStack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(`[data-modal-body] ${FOCUSABLE}`) ??
      panel;
    first?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      if (openStack[openStack.length - 1] !== id || !panel) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstItem || !panel.contains(document.activeElement))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = openStack.indexOf(id);
      if (index >= 0) openStack.splice(index, 1);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-(color:--tf-black)/80 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (dismissible && pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-(color:--tf-B87333-cobre)/50 bg-(color:--tf-0B0C10-obsidiana) text-(color:--tf-C0C0C0-plata) shadow-2xl outline-none animate-in fade-in slide-in-from-bottom-4 sm:max-h-[88dvh] sm:rounded-xl sm:border-2 sm:zoom-in-95",
          TONES[tone],
          SIZES[size]
        )}
      >
        {/* Grab handle: visual cue of the bottom sheet on phones */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-(color:--tf-B87333-cobre)/50" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-(color:--tf-B87333-cobre)/35 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-2">
            {icon && <span className="mt-0.5 shrink-0 text-base">{icon}</span>}
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm font-bold text-(color:--tf-white) sm:text-base">
                {title}
              </h3>
              {subtitle && <div className="mt-0.5 text-[11px] text-(color:--tf-94A3B8-niebla)">{subtitle}</div>}
            </div>
          </div>
          <IconButton label={tr("Cerrar")} onClick={onClose}>
            ✕
          </IconButton>
        </div>

        <div data-modal-body className={cx("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 text-xs sm:px-5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-(color:--tf-B87333-cobre)/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
