import React from "react";
import { handFont } from "../theme";
import { Icon, IconName } from "./icons";

import { tr } from "@/i18n/translate";
interface WelcomeScreenProps {
  showToolbarHint: boolean;
  onOpen: () => void;
  onHelp: () => void;
  onLibrary: () => void;
  onTextToDiagram: () => void;
  onLoadExample: () => void;
}

function HintArrow({ d, className }: { d: string; className: string }) {
  return (
    <svg
      viewBox="0 0 60 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function WelcomeAction({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: IconName;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] text-(color:--tf-94A3B8-niebla) transition-colors hover:bg-(color:--tf-white)/5 hover:text-(color:--tf-white)"
    >
      <span className="text-(color:--tf-B87333-cobre) group-hover:text-(color:--tf-E5A93C-laton)">
        <Icon name={icon} size={16} />
      </span>
      <span className="flex-1">{tr(label)}</span>
      {shortcut && <span className="font-mono text-[11px] text-(color:--tf-E5A93C-laton)/60">{tr(shortcut)}</span>}
    </button>
  );
}

export function WelcomeScreen({
  showToolbarHint,
  onOpen,
  onHelp,
  onLibrary,
  onTextToDiagram,
  onLoadExample,
}: WelcomeScreenProps) {
  const hand = `${handFont.className} text-(color:--tf-94A3B8-niebla)/75`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden">
      {/* Main menu hint */}
      <div className="absolute left-5 top-[58px] hidden items-start sm:flex">
        <HintArrow d="M14 74 C 6 50, 4 30, 12 6 M12 6 L 4 18 M12 6 L 22 16" className="h-16 w-10 text-(color:--tf-94A3B8-niebla)/60" />
        <span className={`${hand} mt-12 text-[19px]`}>{tr("Abrir, exportar, fondo del lienzo...")}</span>
      </div>

      {/* Toolbar hint */}
      {showToolbarHint && (
        <div className="absolute left-[calc(50%+250px)] top-[58px] hidden items-start lg:flex">
          <HintArrow d="M52 74 C 20 68, 8 42, 14 6 M14 6 L 4 18 M14 6 L 25 15" className="h-16 w-12 text-(color:--tf-94A3B8-niebla)/60" />
          <span className={`${hand} mt-12 max-w-[160px] text-[19px] leading-6`}>
            {tr("¡Elige una herramienta y empieza a dibujar!")}
          </span>
        </div>
      )}

      {/* Library hint */}
      <div className="absolute right-6 top-[58px] hidden items-start lg:flex">
        <span className={`${hand} mt-12 max-w-[160px] text-right text-[19px] leading-6`}>
          {tr("Paquetes técnicos C4, UML, BPMN...")}
        </span>
        <HintArrow d="M6 74 C 40 60, 46 36, 40 6 M40 6 L 30 16 M40 6 L 50 16" className="h-16 w-12 text-(color:--tf-94A3B8-niebla)/60" />
      </div>

      {/* Center: brand + quick actions */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="flex max-w-xl flex-col items-center text-center mt-14 sm:mt-0 pb-16 sm:pb-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <svg viewBox="0 0 48 48" className="h-8 w-8 sm:h-11 sm:w-11 shrink-0" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="40" height="40" rx="9" fillOpacity="0.12" style={{ fill: "var(--tf-22C55E-fosforo)", stroke: "var(--tf-22C55E-fosforo)" }} strokeWidth="2" />
              <path d="M12 36 24 12l12 24" style={{ stroke: "var(--tf-E5A93C-laton)" }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 28h16" style={{ stroke: "var(--tf-22D3EE-cian)" }} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
              <circle cx="24" cy="12" r="3" style={{ fill: "var(--tf-B87333-cobre)" }} />
            </svg>
            <div className="text-left font-mono leading-none">
              <div className="text-[20px] sm:text-[28px] font-extrabold tracking-[0.12em] text-(color:--tf-white)">{tr("TWOFFACTOR")}</div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-[12px] font-bold tracking-[0.5em] text-(color:--tf-22C55E-fosforo)">{tr("PLANOS")}</div>
            </div>
          </div>

          <p className={`${hand} mt-3 sm:mt-6 text-sm sm:text-[20px] leading-snug sm:leading-7`}>
            {tr("Tus planos se guardan en el almacenamiento de tu navegador.")}
            <span className="hidden sm:inline"><br />{tr("Guarda tu trabajo en un archivo .plano para evitar perderlo.")}</span>
          </p>

          <div className="pointer-events-auto mt-4 sm:mt-6 w-full max-w-[280px] sm:max-w-[300px] font-sans">
            <WelcomeAction icon="folder" label={tr("Abrir")} shortcut="Ctrl+O" onClick={onOpen} />
            <WelcomeAction icon="help" label={tr("Ayuda")} shortcut="?" onClick={onHelp} />
            <WelcomeAction icon="library" label={tr("Paquetes técnicos")} onClick={onLibrary} />
            <WelcomeAction icon="sparkles" label={tr("Texto a diagrama (IA local)")} onClick={onTextToDiagram} />
            <WelcomeAction icon="example" label={tr("Cargar plano de ejemplo")} onClick={onLoadExample} />
          </div>
        </div>
      </div>
    </div>
  );
}
