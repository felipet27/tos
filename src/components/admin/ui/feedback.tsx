"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { tr } from "@/i18n/translate";
import { Modal } from "./Modal";
import { Button, cx, inputClass, labelClass } from "./kit";

type ToastTone = "ok" | "warn" | "error";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "default";
}

interface PromptOptions extends ConfirmOptions {
  label: string;
  placeholder?: string;
  initialValue?: string;
  required?: boolean;
  multiline?: boolean;
}

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

// Toasts and confirmation dialogs inside the panel (replaces alert/confirm/prompt)
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "ok") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3600);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: "confirm", options, resolve })),
    []
  );

  const prompt = useCallback((options: PromptOptions) => {
    setValue(options.initialValue ?? "");
    return new Promise<string | null>((resolve) => setPending({ kind: "prompt", options, resolve }));
  }, []);

  const api = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt]);

  function close(result: boolean) {
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(result);
    else pending.resolve(result ? value.trim() : null);
    setPending(null);
  }

  const options = pending?.options;
  const isPrompt = pending?.kind === "prompt";
  const promptOptions = isPrompt ? (pending.options as PromptOptions) : null;
  const canConfirm = !promptOptions?.required || value.trim().length > 0;

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <Modal
        open={!!pending}
        onClose={() => close(false)}
        title={options?.title ?? ""}
        tone={options?.tone === "danger" ? "danger" : "laton"}
        size="sm"
        footer={
          <>
            <Button onClick={() => close(false)}>{tr("Cancelar")}</Button>
            <Button
              variant={options?.tone === "danger" ? "danger" : "brass"}
              disabled={!canConfirm}
              onClick={() => close(true)}
              data-autofocus={isPrompt ? undefined : true}
            >
              {options?.confirmLabel ?? tr("Confirmar")}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canConfirm) close(true);
          }}
          className="space-y-3"
        >
          {options?.message && <div className="leading-relaxed text-(color:--tf-C0C0C0-plata)">{options.message}</div>}
          {promptOptions && (
            <label className="block">
              <span className={labelClass}>{promptOptions.label}</span>
              {promptOptions.multiline ? (
                <textarea
                  data-autofocus
                  rows={3}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={promptOptions.placeholder}
                  className={inputClass}
                />
              ) : (
                <input
                  data-autofocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={promptOptions.placeholder}
                  className={inputClass}
                />
              )}
            </label>
          )}
        </form>
      </Modal>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:bottom-14 sm:w-96"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-4 bg-(color:--tf-0B0C10-obsidiana)",
              t.tone === "error"
                ? "border-(color:--tf-red-500)/70 text-(color:--tf-red-300)"
                : t.tone === "warn"
                ? "border-(color:--tf-E5A93C-laton)/70 text-(color:--tf-E5A93C-laton)"
                : "border-(color:--tf-22C55E-fosforo)/70 text-(color:--tf-22C55E-fosforo)"
            )}
          >
            <span>{t.message}</span>
            <button
              type="button"
              aria-label={tr("Cerrar")}
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const api = useContext(FeedbackContext);
  if (!api) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return api;
}
