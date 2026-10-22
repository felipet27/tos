import React, { useCallback, useState } from "react";
import type { ToolType } from "../types";
import { Icon, IconName } from "./icons";
import { ACTIVE, Divider, IDLE, ISLAND, MenuItem, MenuLabel, useEscapeToClose } from "./primitives";

import { tr } from "@/i18n/translate";
const TOOLBAR_TOOLS: { id: ToolType; label: string; icon: IconName; shortcut?: string; fillWhenActive?: boolean }[] = [
  { id: "hand", label: "Mano (desplazar lienzo) — H", icon: "hand" },
  { id: "select", label: "Selección — V o 1", icon: "pointer", shortcut: "V", fillWhenActive: true },
  { id: "rectangle", label: "Rectángulo — R o 2", icon: "square", shortcut: "R", fillWhenActive: true },
  { id: "diamond", label: "Rombo — D o 3", icon: "diamond", shortcut: "D", fillWhenActive: true },
  { id: "ellipse", label: "Elipse — O o 4", icon: "circle", shortcut: "O", fillWhenActive: true },
  { id: "arrow", label: "Flecha — A o 5", icon: "arrow", shortcut: "A" },
  { id: "line", label: "Línea — L o 6", icon: "line", shortcut: "L" },
  { id: "freedraw", label: "Lápiz — P o 7", icon: "pencil", shortcut: "P" },
  { id: "text", label: "Texto — T o 8", icon: "text", shortcut: "T" },
  { id: "note", label: "Nota — N", icon: "note", shortcut: "N" },
  { id: "eraser", label: "Borrador — E o 0", icon: "eraser", shortcut: "E" },
];

const MORE_TOOLS: ToolType[] = ["frame", "laser"];

interface ToolbarProps {
  tool: ToolType;
  onToolChange: (tool: ToolType) => void;
  toolLocked: boolean;
  onToggleLock: () => void;
  hint: React.ReactNode;
  onInsertImage: () => void;
  onTextToDiagram: () => void;
  onMermaid: () => void;
  onOpenLibrary: () => void;
}

export function Toolbar({
  tool,
  onToolChange,
  toolLocked,
  onToggleLock,
  hint,
  onInsertImage,
  onTextToDiagram,
  onMermaid,
  onOpenLibrary,
}: ToolbarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const closeMore = useCallback(() => setIsMoreOpen(false), []);
  useEscapeToClose(isMoreOpen, closeMore);

  function runAndClose(action: () => void) {
    action();
    setIsMoreOpen(false);
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex max-w-[calc(100%-110px)] -translate-x-1/2 flex-col items-center">
      <div className="pointer-events-auto relative max-w-full">
        <div className={`${ISLAND} flex items-center gap-0.5 overflow-x-auto no-scrollbar px-1.5 py-1`}>
          <button
            type="button"
            onClick={onToggleLock}
            title={tr("Mantener la herramienta activa después de dibujar — Q")}
            aria-pressed={toolLocked}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              toolLocked ? ACTIVE : IDLE
            }`}
          >
            <Icon name={toolLocked ? "lock" : "lockOpen"} />
          </button>

          <Divider vertical />

          {TOOLBAR_TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToolChange(t.id)}
                title={tr(t.label)}
                aria-label={tr(t.label)}
                aria-pressed={active}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active ? ACTIVE : IDLE
                }`}
              >
                <Icon name={t.icon} filled={active && t.fillWhenActive} />
                {t.shortcut && (
                  <span
                    className={`absolute bottom-0.5 right-1 font-sans text-[9px] leading-none ${
                      active ? "text-(color:--tf-22C55E-fosforo)/80" : "text-(color:--tf-B87333-cobre)/70"
                    }`}
                  >
                    {tr(t.shortcut)}
                  </span>
                )}
              </button>
            );
          })}

          <Divider vertical />

          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            title={tr("Más herramientas")}
            aria-expanded={isMoreOpen}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isMoreOpen || MORE_TOOLS.includes(tool) ? ACTIVE : IDLE
            }`}
          >
            <Icon name="more" />
          </button>
        </div>

        {isMoreOpen && (
          <>
            <div className="fixed inset-0 z-0" onPointerDown={() => setIsMoreOpen(false)} />
            <div className={`${ISLAND} absolute right-0 top-full z-10 mt-2 w-60 p-1.5 font-sans`}>
              <MenuItem icon="image" label={tr("Insertar imagen")} shortcut="9" onClick={() => runAndClose(onInsertImage)} />
              <MenuItem
                icon="frame"
                label={tr("Herramienta marco")}
                shortcut="F"
                active={tool === "frame"}
                onClick={() => runAndClose(() => onToolChange("frame"))}
              />
              <MenuItem
                icon="laser"
                label={tr("Puntero láser")}
                shortcut="K"
                active={tool === "laser"}
                onClick={() => runAndClose(() => onToolChange("laser"))}
              />
              <Divider />
              <MenuLabel>{tr("Generar")}</MenuLabel>
              <MenuItem
                icon="sparkles"
                label={tr("Texto a diagrama")}
                badge={tr("IA")}
                onClick={() => runAndClose(onTextToDiagram)}
              />
              <MenuItem icon="mermaid" label={tr("Mermaid a diagrama")} onClick={() => runAndClose(onMermaid)} />
              <MenuItem
                icon="library"
                label={tr("Paquetes técnicos")}
                badge="C4"
                onClick={() => runAndClose(onOpenLibrary)}
              />
            </div>
          </>
        )}
      </div>

      {hint && (
        <div className="mt-2 hidden sm:block max-w-md px-2 text-center font-sans text-[11px] leading-snug text-(color:--tf-94A3B8-niebla)/80">
          {hint}
        </div>
      )}
    </div>
  );
}
