import React, { useCallback, useState } from "react";
import { CANVAS_BACKGROUNDS, themeColor } from "../theme";
import { useAdminMode } from "../../adminMode";
import { Icon } from "./icons";
import { ACTIVE, Divider, IDLE, ISLAND, MenuItem, useEscapeToClose } from "./primitives";

import { tr } from "@/i18n/translate";
interface MainMenuProps {
  canvasBg: string;
  onCanvasBgChange: (color: string) => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  zenMode: boolean;
  onToggleZen: () => void;
  toolLocked: boolean;
  onToggleLock: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportImage: () => void;
  onCommandPalette: () => void;
  onFind: () => void;
  onHelp: () => void;
  onReset: () => void;
}

export function MainMenu(props: MainMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const mode = useAdminMode();
  const shownBg = themeColor(props.canvasBg, mode);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsPrefsOpen(false);
  }, []);
  useEscapeToClose(isOpen, close);

  function run(action: () => void) {
    action();
    close();
  }

  const isCustomBg = !CANVAS_BACKGROUNDS.some((c) => c.val.toLowerCase() === props.canvasBg.toLowerCase());

  return (
    <div className="absolute left-3 top-3 z-30">
      <button
        type="button"
        title={tr("Menú principal")}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        className={`${ISLAND} flex h-[42px] w-[42px] items-center justify-center ${isOpen ? ACTIVE : IDLE}`}
      >
        <Icon name="menu" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-0" onPointerDown={close} />
          <div
            className={`${ISLAND} absolute left-0 top-full z-10 mt-2 max-h-[calc(100vh-140px)] w-72 overflow-y-auto p-1.5 font-sans`}
          >
            <MenuItem icon="folder" label={tr("Abrir")} shortcut="Ctrl+O" onClick={() => run(props.onOpen)} />
            <MenuItem icon="download" label={tr("Guardar en...")} shortcut="Ctrl+S" onClick={() => run(props.onSave)} />
            <MenuItem
              icon="exportImage"
              label={tr("Exportar imagen...")}
              shortcut="Ctrl+Shift+E"
              onClick={() => run(props.onExportImage)}
            />
            <MenuItem
              icon="zap"
              label={tr("Paleta de comandos")}
              shortcut="Ctrl+/"
              highlight
              onClick={() => run(props.onCommandPalette)}
            />
            <MenuItem icon="search" label={tr("Encontrar en lienzo")} shortcut="Ctrl+F" onClick={() => run(props.onFind)} />
            <MenuItem icon="help" label={tr("Ayuda")} shortcut="?" onClick={() => run(props.onHelp)} />
            <MenuItem
              icon="trash"
              label={tr("Limpiar lienzo y reiniciar el fondo")}
              onClick={() => run(props.onReset)}
            />

            <Divider />

            <div className="relative">
              <MenuItem
                icon="sliders"
                label={tr("Preferencias")}
                onClick={() => setIsPrefsOpen(!isPrefsOpen)}
                trailing={<Icon name={isPrefsOpen ? "chevronDown" : "chevronRight"} size={14} />}
              />
              {isPrefsOpen && (
                <div className="ml-6 border-l border-(color:--tf-B87333-cobre)/25 pl-1.5">
                  <MenuItem
                    label={tr("Bloquear herramienta")}
                    shortcut="Q"
                    active={props.toolLocked}
                    onClick={props.onToggleLock}
                  />
                  <MenuItem
                    label={tr("Cuadrícula")}
                    shortcut="Ctrl+'"
                    active={props.gridEnabled}
                    onClick={props.onToggleGrid}
                  />
                  <MenuItem
                    label={tr("Modo Zen")}
                    shortcut="Alt+Z"
                    active={props.zenMode}
                    onClick={() => run(props.onToggleZen)}
                  />
                </div>
              )}
            </div>

            <Divider />

            <div className="px-2.5 pb-1.5 pt-1">
              <div className="mb-2 text-[12px] text-(color:--tf-C0C0C0-plata)">{tr("Fondo del lienzo")}</div>
              <div className="flex items-center gap-2">
                {CANVAS_BACKGROUNDS.map((c) => {
                  const active = c.val.toLowerCase() === props.canvasBg.toLowerCase();
                  return (
                    <button
                      key={c.val}
                      type="button"
                      title={tr(c.name)}
                      onClick={() => props.onCanvasBgChange(c.val)}
                      style={{ backgroundColor: themeColor(c.val, mode) }}
                      className={`h-7 w-7 rounded-md border transition-all ${
                        active
                          ? "border-(color:--tf-22C55E-fosforo) ring-2 ring-(color:--tf-22C55E-fosforo)/40"
                          : "border-(color:--tf-B87333-cobre)/40 hover:border-(color:--tf-E5A93C-laton)"
                      }`}
                    />
                  );
                })}
                <div className="mx-0.5 h-6 w-px bg-(color:--tf-B87333-cobre)/30" />
                <label
                  title={tr("Color personalizado")}
                  style={{ backgroundColor: shownBg }}
                  className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border ${
                    isCustomBg ? "border-(color:--tf-22C55E-fosforo) ring-2 ring-(color:--tf-22C55E-fosforo)/40" : "border-(color:--tf-B87333-cobre)/40"
                  }`}
                >
                  <input
                    type="color"
                    value={shownBg}
                    onChange={(e) => props.onCanvasBgChange(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
