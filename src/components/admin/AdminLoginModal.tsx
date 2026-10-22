"use client";

import { useState, useEffect } from "react";

import { tr } from "@/i18n/translate";
interface AdminUser {
  username: string;
  displayName: string;
  role: string;
  node: string;
}

// Passwords are never in the code: .env.local holds their SHA-256 (see .env.example)
const OPERATORS: { user: AdminUser; passwordHash?: string }[] = [
  {
    user: {
      username: "felipe",
      displayName: "Felipe Tangarife",
      role: "CO-FUNDADOR · DIRECTOR DE PRODUCTO Y EXPERIENCIA",
      node: "NODE-ALPHA-FT",
    },
    passwordHash: process.env.NEXT_PUBLIC_TOS_FELIPE_PASSWORD_SHA256?.toLowerCase(),
  },
  {
    user: {
      username: "pablo",
      displayName: "Juan Pablo Hurtado",
      role: "CO-FUNDADOR · DIRECTOR DE ARQUITECTURA Y SEGURIDAD",
      node: "NODE-BETA-JPH",
    },
    passwordHash: process.env.NEXT_PUBLIC_TOS_PABLO_PASSWORD_SHA256?.toLowerCase(),
  },
];

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const operator = OPERATORS.find((o) => o.user.username === cleanUser);
    const hash = await sha256Hex(password.trim());
    // Same pace for right and wrong attempts
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);

    if (operator && operator.passwordHash && hash === operator.passwordHash) {
      onSuccess(operator.user);
    } else {
      setError("Credenciales no autorizadas. Solo personal con clave de doble factor tiene acceso.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-(color:--tf-050A18)/85 backdrop-blur-md transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md my-8 rounded-2xl border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-0B0C10-obsidiana) shadow-[0_0_50px_rgba(184,115,51,0.25)] text-(color:--tf-C0C0C0-plata) overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Retro Header Bar style */}
        <div className="flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/30 bg-gradient-to-r from-(color:--tf-14161F) via-(color:--tf-1C1E2D) to-(color:--tf-14161F) px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-(color:--tf-22C55E-fosforo) shadow-[0_0_6px_rgba(34,197,94,0.4)] animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-(color:--tf-E5A93C-laton) font-semibold">
              {tr("Twoffactor OS // Auth Gate")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="grid h-6 w-6 place-items-center rounded border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white) hover:border-(color:--tf-E5A93C-laton) transition-colors"
              title={tr("Cerrar")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-(color:--tf-E5A93C-laton)/40 bg-(color:--tf-0F121D) shadow-[0_0_20px_rgba(229,169,60,0.15)]">
              {/* Dual Head / Robot Security Lock Icon */}
              <svg className="h-8 w-8 text-(color:--tf-22C55E-fosforo)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1.5" fill="#22c55e" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-(color:--tf-white) font-mono">
              {tr("PANEL ADMINISTRATIVO")}
            </h2>
            <p className="mt-1 text-xs text-(color:--tf-94A3B8-niebla)">
              {tr("Acceso seguro con verificación de dos factores (Active-Active)")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-sm">
            <div>
              <label className="block text-xs uppercase tracking-wider text-(color:--tf-E5A93C-laton) mb-1.5 font-semibold">
                {tr("Nombre de Operador")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={tr("felipe o pablo")}
                  className="w-full rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07080C) px-3.5 py-2.5 text-sm text-(color:--tf-C0C0C0-plata) placeholder:text-(color:--tf-555A68) focus:border-(color:--tf-22C55E-fosforo) focus:ring-1 focus:ring-(color:--tf-22C55E-fosforo) focus:outline-none transition-all font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-(color:--tf-555A68)">
                  {tr("[USER]")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-(color:--tf-E5A93C-laton) mb-1.5 font-semibold">
                {tr("Contraseña de Acceso")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07080C) px-3.5 py-2.5 text-sm text-(color:--tf-C0C0C0-plata) placeholder:text-(color:--tf-555A68) focus:border-(color:--tf-22C55E-fosforo) focus:ring-1 focus:ring-(color:--tf-22C55E-fosforo) focus:outline-none transition-all font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-xs text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-22C55E-fosforo) transition-colors"
                >
                  {showPassword ? tr("OCULTAR") : tr("VER")}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/30 p-3 text-xs text-(color:--tf-red-300) flex items-start gap-2">
                <svg className="h-4 w-4 shrink-0 text-(color:--tf-red-400) mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{tr(error)}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-lg border border-(color:--tf-E5A93C-laton) bg-gradient-to-r from-(color:--tf-B87333-cobre) via-(color:--tf-E5A93C-laton) to-(color:--tf-B87333-cobre) px-4 py-3 font-semibold text-(color:--tf-0B0C10-obsidiana) shadow-[0_0_20px_rgba(229,169,60,0.3)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 font-mono uppercase tracking-wider text-xs font-bold text-(color:--tf-black)">
                  {loading ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-(color:--tf-black) border-t-transparent" />
                      {tr("Validando doble factor...")}
                    </>
                  ) : (
                    <>
                      {tr("Ingresar al Panel")}
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>

          {/* Micro status footer */}
          <div className="mt-5 border-t border-(color:--tf-1C2237) pt-3 text-center text-[10px] text-(color:--tf-6B7280) font-mono">
            <span>{tr("C:\\SYSTEM\\TWO_HEAD_ACTIVE_ACTIVE> AUTH_REQUIRED")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
