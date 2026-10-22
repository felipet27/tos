import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PlanoElement } from "../types";
import { renderElementsToCanvas } from "../renderer";
import { useAdminMode } from "../../adminMode";
import {
  convertAIDiagramToElements,
  generateDiagramWithAI,
  parseMermaidToElements,
  testOllamaConnection,
} from "../localAiService";
import { Icon, IconName } from "./icons";
import { Dialog, Kbd } from "./primitives";

import { tr } from "@/i18n/translate";
const PRIMARY_BTN =
  "rounded-lg border border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/20 px-4 py-2 text-[13px] font-bold text-(color:--tf-22C55E-fosforo) transition-colors hover:bg-(color:--tf-22C55E-fosforo)/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40";
const SECONDARY_BTN =
  "rounded-lg border border-(color:--tf-B87333-cobre)/40 px-4 py-2 text-[13px] font-semibold text-(color:--tf-C0C0C0-plata) transition-colors hover:bg-(color:--tf-white)/5 hover:text-(color:--tf-white) disabled:pointer-events-none disabled:opacity-40";
const INPUT =
  "w-full rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/50 p-2.5 text-[13px] text-(color:--tf-white) outline-none placeholder:text-(color:--tf-5B6170) focus:border-(color:--tf-22C55E-fosforo)";

// ---------------------------------------------------------------- Help
const SHORTCUT_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Herramientas",
    items: [
      ["V / 1", "Selección"],
      ["H", "Mano"],
      ["R / 2", "Rectángulo"],
      ["D / 3", "Rombo"],
      ["O / 4", "Elipse"],
      ["A / 5", "Flecha (pulsa de nuevo para cambiar el tipo)"],
      ["L / 6", "Línea"],
      ["P / 7", "Lápiz"],
      ["T / 8", "Texto"],
      ["N", "Nota"],
      ["9", "Insertar imagen"],
      ["E / 0", "Borrador"],
      ["F", "Marco"],
      ["K", "Puntero láser"],
      ["Q", "Bloquear herramienta"],
    ],
  },
  {
    title: "Editor",
    items: [
      ["Ctrl+Z", "Deshacer"],
      ["Ctrl+Y / Ctrl+Shift+Z", "Rehacer"],
      ["Supr", "Eliminar selección"],
      ["Ctrl+D", "Duplicar"],
      ["Ctrl+C / Ctrl+V", "Copiar / pegar"],
      ["Ctrl+A", "Seleccionar todo"],
      ["Flechas", "Mover selección (Shift = 10px)"],
      ["Ctrl+] / Ctrl+[", "Traer adelante / enviar atrás"],
      ["Doble clic", "Editar texto o crear texto"],
      ["Shift + arrastrar", "Mantener proporción / ángulo"],
      ["Ctrl+O / Ctrl+S", "Abrir / guardar .plano"],
      ["Ctrl+Shift+E", "Exportar imagen"],
      ["Ctrl+/", "Paleta de comandos"],
      ["Ctrl+F", "Encontrar en lienzo"],
    ],
  },
  {
    title: "Vista",
    items: [
      ["Espacio + arrastrar", "Mover lienzo"],
      ["Rueda", "Desplazar lienzo"],
      ["Ctrl + rueda", "Zoom"],
      ["Ctrl + / Ctrl -", "Acercar / alejar"],
      ["Ctrl+0", "Restablecer zoom"],
      ["Shift+1", "Ajustar todo"],
      ["Shift+2", "Ajustar a la selección"],
      ["Ctrl+'", "Cuadrícula"],
      ["Alt+Z", "Modo Zen"],
    ],
  },
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={tr("Ayuda · Atajos de teclado")} icon="keyboard" onClose={onClose} width="max-w-4xl">
      <div className="grid gap-4 md:grid-cols-3">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="rounded-lg border border-(color:--tf-B87333-cobre)/25 bg-(color:--tf-black)/30 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr(group.title)}</div>
            <div className="space-y-1.5">
              {group.items.map(([keys, label]) => (
                <div key={label} className="flex items-start justify-between gap-3 text-[12px]">
                  <span className="text-(color:--tf-C0C0C0-plata)">{tr(label)}</span>
                  <span className="shrink-0">
                    <Kbd>{tr(keys)}</Kbd>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Export image
export function ExportImageDialog({
  elements,
  selectedIds,
  canvasBg,
  onClose,
}: {
  elements: PlanoElement[];
  selectedIds: string[];
  canvasBg: string;
  onClose: () => void;
}) {
  const [withBackground, setWithBackground] = useState(true);
  const [onlySelected, setOnlySelected] = useState(selectedIds.length > 0);
  const [scale, setScale] = useState(2);
  const mode = useAdminMode();
  const [status, setStatus] = useState("");

  const target = useMemo(
    () => (onlySelected ? elements.filter((el) => selectedIds.includes(el.id)) : elements),
    [elements, onlySelected, selectedIds]
  );

  const preview = useMemo(() => {
    const canvas = renderElementsToCanvas(target, { scale: 1, background: withBackground ? canvasBg : null, mode });
    return canvas?.toDataURL("image/png") ?? "";
  }, [target, withBackground, canvasBg, mode]);

  function buildCanvas() {
    return renderElementsToCanvas(target, { scale, background: withBackground ? canvasBg : null, mode });
  }

  function handleDownload() {
    const canvas = buildCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `twoffactor-plano-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("Imagen descargada.");
  }

  function handleCopy() {
    const canvas = buildCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("Imagen copiada al portapapeles.");
      } catch {
        setStatus("El navegador no permitió copiar la imagen. Usa «Descargar PNG».");
      }
    }, "image/png");
  }

  const toggle = (label: string, value: boolean, onToggle: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-[13px] text-(color:--tf-C0C0C0-plata) disabled:opacity-35"
    >
      {tr(label)}
      <span
        className={`relative h-5 w-9 rounded-full border transition-colors ${
          value ? "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/30" : "border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            value ? "left-[18px] bg-(color:--tf-22C55E-fosforo)" : "left-0.5 bg-(color:--tf-94A3B8-niebla)"
          }`}
        />
      </span>
    </button>
  );

  return (
    <Dialog title={tr("Exportar imagen")} icon="exportImage" onClose={onClose} width="max-w-3xl">
      {elements.length === 0 ? (
        <p className="text-[13px] text-(color:--tf-94A3B8-niebla)">{tr("El lienzo está vacío: no hay nada que exportar todavía.")}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_240px]">
          <div
            className="flex min-h-[260px] items-center justify-center rounded-lg border border-(color:--tf-B87333-cobre)/30 p-3"
            style={{
              backgroundImage:
                "linear-gradient(45deg,var(--tf-checker-preview) 25%,transparent 25%),linear-gradient(-45deg,var(--tf-checker-preview) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,var(--tf-checker-preview) 75%),linear-gradient(-45deg,transparent 75%,var(--tf-checker-preview) 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview && <img src={preview} alt={tr("Vista previa")} className="max-h-[320px] max-w-full object-contain" />}
          </div>
          <div className="flex flex-col gap-1">
            {toggle("Fondo del lienzo", withBackground, () => setWithBackground(!withBackground))}
            {toggle("Solo selección", onlySelected, () => setOnlySelected(!onlySelected), selectedIds.length === 0)}
            <div className="mt-2 text-[12px] text-(color:--tf-94A3B8-niebla)">{tr("Escala")}</div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`flex-1 rounded-lg border py-1.5 font-mono text-[12px] ${
                    scale === s
                      ? "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)"
                      : "border-(color:--tf-B87333-cobre)/30 text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-2 pt-4">
              <button type="button" className={PRIMARY_BTN} onClick={handleDownload}>
                {tr("Descargar PNG")}
              </button>
              <button type="button" className={SECONDARY_BTN} onClick={handleCopy}>
                {tr("Copiar al portapapeles")}
              </button>
              {status && <p className="text-[11px] text-(color:--tf-E5A93C-laton)">{tr(status)}</p>}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Text to diagram / Mermaid
type AIKind = "c4" | "erd" | "uml" | "bpmn" | "twoffactor";

export function GenerateDialog({
  initialMode,
  onClose,
  getInsertPoint,
  onInsert,
}: {
  initialMode: "ai" | "mermaid";
  onClose: () => void;
  getInsertPoint: () => { x: number; y: number };
  onInsert: (elements: PlanoElement[]) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<AIKind>("c4");
  const [model, setModel] = useState("llama3.1:8b");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [mermaidCode, setMermaidCode] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus(tr("Consultando Ollama en {url} y procesando el modelo...", { url: ollamaUrl }));
    try {
      const res = await generateDiagramWithAI({ prompt, kind, ollamaUrl, model });
      const at = getInsertPoint();
      onInsert(convertAIDiagramToElements(res, at.x, at.y));
      onClose();
    } catch {
      setStatus("Error al generar el diagrama. Verifica que Ollama esté en ejecución.");
    } finally {
      setLoading(false);
    }
  }

  function handleMermaid() {
    const at = getInsertPoint();
    const parsed = parseMermaidToElements(mermaidCode, at.x, at.y);
    if (parsed.length === 0) {
      setStatus("No se pudo interpretar el código. Usa una sintaxis como: A[Cliente] --> B[Servidor]");
      return;
    }
    onInsert(parsed);
    onClose();
  }

  const tabs: { id: "ai" | "mermaid"; label: string; icon: IconName }[] = [
    { id: "ai", label: "Texto a diagrama", icon: "sparkles" },
    { id: "mermaid", label: "Mermaid a diagrama", icon: "mermaid" },
  ];

  return (
    <Dialog title={tr("Generar diagrama")} icon="sparkles" onClose={onClose} width="max-w-2xl">
      <div className="mb-4 flex gap-1 rounded-lg border border-(color:--tf-B87333-cobre)/30 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setStatus("");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-[12px] font-semibold ${
              mode === t.id ? "bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {tr(t.label)}
            {t.id === "ai" && (
              <span className="rounded bg-(color:--tf-22D3EE-cian)/20 px-1 font-mono text-[9px] font-bold text-(color:--tf-22D3EE-cian)">{tr("IA")}</span>
            )}
          </button>
        ))}
      </div>

      {mode === "ai" ? (
        <form onSubmit={handleGenerate} className="space-y-3">
          <p className="text-[12px] text-(color:--tf-94A3B8-niebla)">
            {tr("Se ejecuta 100% en tu máquina con Ollama, sin enviar datos a la nube.")}
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {(
              [
                ["c4", "C4"],
                ["twoffactor", "Twoffactor 2FA"],
                ["erd", "ERD"],
                ["bpmn", "BPMN"],
                ["uml", "UML"],
              ] as [AIKind, string][]
            ).map(([id, name]) => (
              <button
                type="button"
                key={id}
                onClick={() => setKind(id)}
                className={`rounded-lg border p-2 text-[11px] font-bold ${
                  kind === id
                    ? "border-(color:--tf-22D3EE-cian) bg-(color:--tf-22D3EE-cian)/15 text-(color:--tf-22D3EE-cian)"
                    : "border-(color:--tf-B87333-cobre)/30 text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
                }`}
              >
                {tr(name)}
              </button>
            ))}
          </div>
          <textarea
            rows={4}
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={tr("Ej: Arquitectura de autenticación con clúster de doble nodo Bogotá y Miami, túnel mTLS y verificación con enclave FIPS 140-3...")}
            className={INPUT}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-(color:--tf-94A3B8-niebla)">
              {tr("Endpoint local")}
              <input value={ollamaUrl} onChange={(e) => setOllamaUrl(e.target.value)} className={`${INPUT} mt-1 py-1.5`} />
            </label>
            <label className="text-[11px] text-(color:--tf-94A3B8-niebla)">
              {tr("Modelo")}
              <select value={model} onChange={(e) => setModel(e.target.value)} className={`${INPUT} mt-1 py-1.5`}>
                <option value="llama3.1:8b">{tr("llama3.1:8b (Recomendado)")}</option>
                <option value="qwen2.5-coder:7b">{tr("qwen2.5-coder:7b (Técnico)")}</option>
                <option value="llama3.2:3b">{tr("llama3.2:3b (Liviano)")}</option>
              </select>
            </label>
          </div>
          {status && (
            <div className="rounded-lg border border-(color:--tf-E5A93C-laton)/40 bg-(color:--tf-E5A93C-laton)/10 p-2 text-[12px] text-(color:--tf-E5A93C-laton)">{tr(status)}</div>
          )}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={async () => setStatus((await testOllamaConnection(ollamaUrl)).message)}
              className="text-[12px] text-(color:--tf-94A3B8-niebla) underline hover:text-(color:--tf-white)"
            >
              {tr("Probar conexión con Ollama")}
            </button>
            <button type="submit" disabled={loading} className={PRIMARY_BTN}>
              {loading ? tr("Generando...") : tr("Generar e insertar")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-(color:--tf-94A3B8-niebla)">
            {tr("Pega un diagrama de flujo Mermaid y se convertirá en elementos editables del plano.")}
          </p>
          <textarea
            rows={8}
            value={mermaidCode}
            onChange={(e) => setMermaidCode(e.target.value)}
            placeholder={tr("graph TD;\nA[Cliente] -->|mTLS| B[Enclave Twoffactor];\nB --> C[Nodo Miami]")}
            className={`${INPUT} font-mono text-(color:--tf-22C55E-fosforo)`}
          />
          {status && (
            <div className="rounded-lg border border-(color:--tf-E5A93C-laton)/40 bg-(color:--tf-E5A93C-laton)/10 p-2 text-[12px] text-(color:--tf-E5A93C-laton)">{tr(status)}</div>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={handleMermaid} disabled={!mermaidCode.trim()} className={PRIMARY_BTN}>
              {tr("Insertar en el plano")}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- Confirm
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={tr(title)} icon="trash" onClose={onClose} width="max-w-md">
      <p className="text-[13px] leading-relaxed text-(color:--tf-C0C0C0-plata)">{tr(message)}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={SECONDARY_BTN} onClick={onClose}>
          {tr("Cancelar")}
        </button>
        <button
          type="button"
          className="rounded-lg border border-(color:--tf-red-500)/70 bg-(color:--tf-red-500)/15 px-4 py-2 text-[13px] font-bold text-(color:--tf-red-300) hover:bg-(color:--tf-red-500)/25"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {tr(confirmLabel)}
        </button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Command palette
export interface Command {
  id: string;
  label: string;
  category: string;
  icon?: IconName;
  shortcut?: string;
  run: () => void;
}

export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = commands.filter((c) => {
    const haystack = `${c.label} ${c.category}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
  const safeActive = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${safeActive}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeActive]);

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    onClose();
    cmd.run();
  }

  return (
    <Dialog title={tr("Paleta de comandos")} icon="zap" onClose={onClose} width="max-w-lg">
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((safeActive + 1) % Math.max(results.length, 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((safeActive - 1 + results.length) % Math.max(results.length, 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(results[safeActive]);
          }
        }}
        placeholder={tr("Busca una herramienta o acción...")}
        className={INPUT}
      />
      <div ref={listRef} className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">
        {results.length === 0 && <p className="px-2 py-3 text-[12px] text-(color:--tf-94A3B8-niebla)">{tr("Sin resultados.")}</p>}
        {results.map((cmd, i) => (
          <button
            key={cmd.id}
            type="button"
            data-index={i}
            onMouseEnter={() => setActive(i)}
            onClick={() => run(cmd)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${
              i === safeActive ? "bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-white)" : "text-(color:--tf-C0C0C0-plata)"
            }`}
          >
            {cmd.icon ? <Icon name={cmd.icon} size={15} className="text-(color:--tf-B87333-cobre)" /> : <span className="w-[15px]" />}
            <span className="flex-1">{tr(cmd.label)}</span>
            <span className="text-[10px] uppercase tracking-wide text-(color:--tf-5B6170)">{tr(cmd.category)}</span>
            {cmd.shortcut && <span className="font-mono text-[11px] text-(color:--tf-E5A93C-laton)/70">{tr(cmd.shortcut)}</span>}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
