"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BovedaModule } from "./BovedaModule";
import { ObservatorioModule } from "./ObservatorioModule";
import { HandshakeModule } from "./HandshakeModule";
import { CultivoModule } from "./CultivoModule";
import { TallerModule } from "./TallerModule";
import { AdminMode, AdminModeContext, loadAdminMode, saveAdminMode, useDynamicFavicon } from "./adminMode";
import { SessionContext } from "./session";
import { ModuleKey, adminPath, navigate, useAdminRoute } from "./nav";
import { OperatorName, SessionUser, operatorFromUser } from "./data/operators";
import { useClients } from "./data/clients";
import { activeSprint, getTaskTimeMetrics, useSprints, useTasks } from "./data/tasks";
import { useActionCount } from "./data/reviews";
import { useLastSavedAt } from "./data/store";
import { daysBetween, parseStamp, useNow } from "./data/time";
import { FeedbackProvider } from "./ui/feedback";
import { GlobalSearch } from "./ui/GlobalSearch";
import { cx } from "./ui/kit";

import { tr } from "@/i18n/translate";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export type AdminUser = SessionUser;

interface AdminPanelProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const MODULES: { key: ModuleKey; label: string; active: string }[] = [
  { key: "boveda", label: "Bóveda", active: "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo)" },
  { key: "handshake", label: "Handshake", active: "border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/15 text-(color:--tf-E5A93C-laton)" },
  { key: "cultivo", label: "Cultivo", active: "border-(color:--tf-22D3EE-cian) bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian)" },
  { key: "taller", label: "Taller", active: "border-(color:--tf-B87333-cobre) bg-(color:--tf-B87333-cobre)/20 text-(color:--tf-white)" },
  { key: "observatorio", label: "Observatorio", active: "border-(color:--tf-22D3EE-cian) bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian)" },
];

const MODULE_PROMPTS: Record<ModuleKey, { forja: string; cristal: string; subtitle: string }> = {
  boveda: { forja: "BOVEDA", cristal: "BOVEDA/CLIENTES", subtitle: "EXPEDIENTES & TELEMETRÍA" },
  handshake: { forja: "HANDSHAKE", cristal: "HANDSHAKE/CONTRATOS", subtitle: "ACUERDOS COMERCIALES & SLA" },
  cultivo: { forja: "CULTIVO", cristal: "CULTIVO/IDEAS-CAD", subtitle: "BANCO DE IDEAS & PLANOS" },
  taller: { forja: "TALLER", cristal: "TALLER/SPRINT-ADR", subtitle: "INGENIERÍA & SPRINT BOARD" },
  observatorio: { forja: "OBSERVATORIO", cristal: "OBSERVATORIO/ENCLAVE", subtitle: "VISTOS BUENOS & AUDITORÍA" },
};

function roleLabel(user: AdminUser) {
  if (user.username === "felipe") return tr("CO-FUNDADOR · DIRECTOR DE PRODUCTO Y EXPERIENCIA");
  if (user.username === "pablo") return tr("CO-FUNDADOR · DIRECTOR DE ARQUITECTURA Y SEGURIDAD");
  return tr(user.role).toUpperCase();
}

export function AdminPanel({ user, isOpen, onClose, onLogout }: AdminPanelProps) {
  const route = useAdminRoute();
  const activeModule = route.module;
  const me = operatorFromUser(user);
  const session = useMemo(() => ({ user, me }), [user, me]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<AdminMode>(loadAdminMode);
  useDynamicFavicon(mode);
  const actionCount = useActionCount(me);

  function changeMode(next: AdminMode) {
    setMode(next);
    saveAdminMode(next);
  }

  // The panel fills the window: keep the page itself from scrolling
  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (!isOpen) return null;

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  function goTo(module: ModuleKey) {
    navigate(module);
    setIsMobileMenuOpen(false);
  }

  const isCristal = mode === "cristal";
  const prompt = MODULE_PROMPTS[activeModule];
  const pathTail = route.sub ? `\\${route.sub.toUpperCase()}` : "";

  return (
    <AdminModeContext.Provider value={mode}>
      <SessionContext.Provider value={session}>
        <div
          role="region"
          aria-label={tr("Panel Administrativo Twoffactor")}
          data-tf-mode={mode}
          className={cx(
            "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden overscroll-contain bg-(color:--tf-0B0C10-obsidiana) text-(color:--tf-C0C0C0-plata) select-text",
            isCristal ? "font-sans" : "font-mono"
          )}
        >
          <FeedbackProvider>
            {/* ================= TOP SYSTEM BAR ================= */}
            <header
              data-tf-surface="deep"
              className="shrink-0 select-none border-b-2 border-(color:--tf-B87333-cobre)/70 bg-gradient-to-r from-(color:--tf-11131C) via-(color:--tf-1C2030) to-(color:--tf-11131C) px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-md sm:px-4"
            >
              {/* Desktop */}
              <div className="hidden items-center justify-between gap-3 md:flex">
                <div className="flex items-center gap-3">
                  <div className="grid h-6 w-6 place-items-center rounded bg-(color:--tf-B87333-cobre) font-mono text-xs font-black text-(color:--tf-black)">2F</div>
                  <span className="text-xs font-bold tracking-wider text-(color:--tf-E5A93C-laton)">{tr("TOS // TwoFFactor Sistema Operativo")}</span>
                  <div className="flex items-center gap-1.5">
                    {(["forja", "cristal"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => changeMode(m)}
                        aria-pressed={mode === m}
                        className={cx(
                          "rounded border px-2 py-0.5 font-mono text-[10px] transition-all",
                          mode === m
                            ? "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/25 text-(color:--tf-22C55E-fosforo) ring-1 ring-(color:--tf-22C55E-fosforo)"
                            : "border-(color:--tf-22C55E-fosforo)/40 bg-(color:--tf-22C55E-fosforo)/5 text-(color:--tf-22C55E-fosforo)/75 hover:bg-(color:--tf-22C55E-fosforo)/15"
                        )}
                      >
                        {m === "forja" ? tr("STEAMPUNK DE TALLER") : tr("LABORATORIO FUTURISTA")}
                      </button>
                    ))}
                    <LanguageSwitcher
                      className="ml-1 rounded border border-(color:--tf-22C55E-fosforo)/40 font-mono"
                      activeClassName="bg-(color:--tf-22C55E-fosforo)/25 text-(color:--tf-22C55E-fosforo)"
                      idleClassName="text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-(color:--tf-22C55E-fosforo)" />
                    <span className="text-(color:--tf-94A3B8-niebla)">{tr("OPERADOR:")}</span>
                    <strong className="text-(color:--tf-white)">{tr(user.displayName)}</strong>
                    <span className="hidden font-mono text-[10px] text-(color:--tf-22C55E-fosforo) xl:inline">[{roleLabel(user)}]</span>
                    <span className="font-mono text-[10px] text-(color:--tf-22C55E-fosforo)">[{tr(user.node)}]</span>
                  </div>
                  <div className="ml-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? tr("Salir de Pantalla Completa") : tr("Pantalla Completa F11")}
                      title={isFullscreen ? tr("Salir de Pantalla Completa") : tr("Pantalla Completa F11")}
                      className="grid h-7 w-7 place-items-center rounded border border-(color:--tf-C0C0C0-plata)/30 bg-(color:--tf-161B2B) text-xs text-(color:--tf-white) transition-colors hover:bg-(color:--tf-252E49)"
                    >
                      {isFullscreen ? "❐" : "□"}
                    </button>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex items-center gap-1 rounded border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/60 px-2.5 py-1 text-xs font-bold text-(color:--tf-red-300) transition-colors hover:bg-(color:--tf-red-900)/80 hover:text-(color:--tf-white)"
                    >
                      {tr("✕ Salir")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile */}
              <div className="flex items-center justify-between gap-2 md:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-(color:--tf-B87333-cobre) font-mono text-xs font-black text-(color:--tf-black)">2F</div>
                  <span className="text-xs font-bold tracking-wider text-(color:--tf-E5A93C-laton)">TOS</span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(color:--tf-22C55E-fosforo)" />
                  <span className="max-w-[110px] truncate text-[11px] font-semibold text-(color:--tf-white)">{user.displayName.split(" ")[0]}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => changeMode(isCristal ? "forja" : "cristal")}
                    className={cx(
                      "flex h-9 items-center rounded border px-2 font-mono text-[11px]",
                      isCristal
                        ? "border-(color:--tf-22D3EE-cian)/60 bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian)"
                        : "border-(color:--tf-E5A93C-laton)/60 bg-(color:--tf-E5A93C-laton)/15 text-(color:--tf-E5A93C-laton)"
                    )}
                  >
                    {isCristal ? tr("💎 Cristal") : tr("⚙️ Forja")}
                  </button>
                  <LanguageSwitcher
                    className="rounded border border-(color:--tf-22C55E-fosforo)/40 font-mono text-[10px]"
                    activeClassName="bg-(color:--tf-22C55E-fosforo)/25 text-(color:--tf-22C55E-fosforo)"
                    idleClassName="text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={tr("Menú del sistema")}
                    aria-expanded={isMobileMenuOpen}
                    className="relative grid h-9 w-9 place-items-center rounded border border-(color:--tf-B87333-cobre)/50 bg-(color:--tf-141624) text-sm text-(color:--tf-C0C0C0-plata)"
                  >
                    {isMobileMenuOpen ? "✕" : "☰"}
                  </button>
                </div>
              </div>

              {isMobileMenuOpen && (
                <div className="mt-2 space-y-2 border-t border-(color:--tf-B87333-cobre)/40 pt-2 animate-in fade-in slide-in-from-top-2 md:hidden">
                  <div className="rounded-lg border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-07080C) p-2.5 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase text-(color:--tf-94A3B8-niebla)">{tr("Operador en Línea")}</span>
                      <span className="font-mono text-[10px] text-(color:--tf-22C55E-fosforo)">[{tr(user.node)}]</span>
                    </div>
                    <div className="text-sm font-bold text-(color:--tf-white)">{tr(user.displayName)}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-(color:--tf-22C55E-fosforo)">{roleLabel(user)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleFullscreen();
                        setIsMobileMenuOpen(false);
                      }}
                      className="min-h-11 rounded border border-(color:--tf-C0C0C0-plata)/30 bg-(color:--tf-161B2B) px-3 text-xs text-(color:--tf-white)"
                    >
                      {isFullscreen ? tr("❐ Normal") : tr("□ Pantalla completa")}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-11 rounded border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-1C2237) px-3 text-xs text-(color:--tf-white)"
                    >
                      {tr("↗ Volver a la web")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/80 px-3 text-xs font-bold text-(color:--tf-red-300)"
                  >
                    ✕ {tr("Cerrar Sesión")}
                  </button>
                </div>
              )}
            </header>

            {/* ================= PATH, SEARCH & MODULES ================= */}
            <div className="flex shrink-0 select-none flex-col gap-2 border-b border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07080E) px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-lg border border-(color:--tf-E5A93C-laton)/50 bg-(color:--tf-black) sm:h-10 sm:w-12">
                  <Image
                    src={isCristal ? "/images/dive-1-robot.jpg" : "/images/twoffactor-blueprint.jpg"}
                    alt={tr("Twoffactor Robot")}
                    fill
                    className={isCristal ? "object-cover object-[52%_12%] scale-[2.2]" : "object-cover object-top"}
                    priority
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold tracking-wide text-(color:--tf-white)">{tr("TWOFFACTOR — SISTEMA OPERATIVO")}</div>
                  <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-(color:--tf-22C55E-fosforo) sm:text-[11px]">
                    {isCristal ? (
                      <span className="tf-mono truncate">LAB://{prompt.cristal}{route.sub ? `/${route.sub.toUpperCase()}` : ""} ▸</span>
                    ) : (
                      <span className="flex min-w-0 items-center">
                        <span className="truncate">C:\TOS\{prompt.forja}{pathTail}&gt;</span>
                        <span className="animate-pulse">_</span>
                      </span>
                    )}
                    <span className="hidden truncate text-(color:--tf-94A3B8-niebla) lg:inline">• {tr(prompt.subtitle)}</span>
                  </div>
                </div>
                <GlobalSearch />
              </div>

              <nav aria-label={tr("Módulos")} className="-mx-3 flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-1 no-scrollbar sm:gap-2 md:mx-0 md:px-0 md:py-0">
                {MODULES.map((m) => {
                  const isActive = activeModule === m.key;
                  const badge = m.key === "observatorio" ? actionCount : 0;
                  return (
                    <a
                      key={m.key}
                      href={adminPath(m.key)}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(m.key);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={cx(
                        "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition-all pointer-coarse:min-h-10",
                        isActive
                          ? m.active
                          : "border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 text-(color:--tf-94A3B8-niebla) hover:border-(color:--tf-B87333-cobre) hover:text-(color:--tf-white)"
                      )}
                    >
                      <span>+</span>
                      <span>{tr(m.label)}</span>
                      {badge > 0 && (
                        <span
                          className="ml-0.5 min-w-5 rounded-full bg-(color:--tf-E5A93C-laton) px-1.5 text-center text-[10px] font-black leading-5 text-(color:--tf-black)"
                          aria-label={tr("{count} esperan tu acción", { count: badge })}
                          title={tr("{count} esperan tu acción", { count: badge })}
                        >
                          {badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* ================= MAIN ================= */}
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-(color:--tf-0B0C10-obsidiana) p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-5">
              {activeModule === "boveda" && <BovedaModule clientId={route.sub} />}
              {activeModule === "observatorio" && <ObservatorioModule />}
              {activeModule === "handshake" && <HandshakeModule tab={route.sub} clientId={route.sub2} />}
              {activeModule === "cultivo" && <CultivoModule sub={route.sub} />}
              {activeModule === "taller" && <TallerModule sub={route.sub} />}
            </main>

            <StatusBar me={me} username={user.username} onClose={onClose} />
          </FeedbackProvider>
        </div>
      </SessionContext.Provider>
    </AdminModeContext.Provider>
  );
}

// Bottom bar (desktop): live figures of the data, not decoration
function StatusBar({ me, username, onClose }: { me: OperatorName; username: string; onClose: () => void }) {
  const clients = useClients();
  const tasks = useTasks();
  const sprints = useSprints();
  const actionCount = useActionCount(me);
  const savedAt = useLastSavedAt();
  const now = useNow();

  const active = clients.filter((c) => !c.archived);
  const inProduction = active.filter((c) => c.currentStage === 5).length;
  const delayed = tasks.filter((t) => getTaskTimeMetrics(t, now).status === "retrasada").length;
  const sprint = activeSprint(sprints);
  const daysLeft = sprint ? daysBetween(now, parseStamp(`${sprint.end} 23:59`)) : null;

  const item = "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:bg-(color:--tf-white)/10";

  return (
    <footer
      data-tf-surface="deep"
      className="hidden shrink-0 select-none items-center justify-between gap-2 border-t-2 border-(color:--tf-B87333-cobre)/50 bg-(color:--tf-07090E) px-4 py-1.5 text-[11px] text-(color:--tf-94A3B8-niebla) md:flex"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
        <button type="button" className={item} onClick={() => navigate("boveda")}>
          {tr("Clientes:")} <strong className="text-(color:--tf-white)">{active.length}</strong>
          <span>· {tr("en producción:")}</span> <strong className="text-(color:--tf-22C55E-fosforo)">{inProduction}</strong>
        </button>
        <span aria-hidden>|</span>
        <button type="button" className={item} onClick={() => navigate("observatorio")}>
          {tr("Esperan tu acción:")}
          <strong className={actionCount > 0 ? "text-(color:--tf-E5A93C-laton)" : "text-(color:--tf-22C55E-fosforo)"}>{actionCount}</strong>
        </button>
        <span aria-hidden>|</span>
        <button type="button" className={item} onClick={() => navigate("taller")}>
          {tr("Tareas retrasadas:")}
          <strong className={delayed > 0 ? "text-(color:--tf-red-300)" : "text-(color:--tf-22C55E-fosforo)"}>{delayed}</strong>
        </button>
        {sprint && daysLeft !== null && (
          <>
            <span aria-hidden>|</span>
            <button type="button" className={cx(item, "max-w-80")} onClick={() => navigate("taller")}>
              <span className="truncate">{tr(sprint.name)}</span>
              <strong className={daysLeft < 0 ? "text-(color:--tf-red-300)" : "text-(color:--tf-white)"}>
                {daysLeft < 0 ? tr("vencido") : tr("{n} días restantes", { n: daysLeft })}
              </strong>
            </button>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1.5 text-(color:--tf-22C55E-fosforo)">
          <span className="h-2 w-2 rounded-full bg-(color:--tf-22C55E-fosforo)" />
          {tr("EN LÍNEA:")} {username.toUpperCase()}
        </span>
        <span title={tr("Los datos se guardan en este navegador")}>
          {savedAt ? tr("Guardado {time}", { time: savedAt.slice(11) }) : tr("Datos locales de este navegador")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-(color:--tf-1C2237) px-2.5 py-0.5 text-xs text-(color:--tf-C0C0C0-plata) transition-colors hover:bg-(color:--tf-28314E) hover:text-(color:--tf-white)"
        >
          {tr("Volver a Web")}
        </button>
      </div>
    </footer>
  );
}
