"use client";

import React, { useEffect, useRef, useState } from "react";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Bounds, ElementType, PlanoElement, Point, ToolType, Viewport } from "./types";
import {
  AppStyle,
  DEFAULT_CANVAS_BG,
  DEFAULT_STYLE,
  LINE_HEIGHT,
  CANVAS_CHROME,
  STROKE_PALETTE,
  getFontStack,
  themeColor,
} from "./theme";
import { useAdminMode } from "../adminMode";
import {
  HANDLE_CURSORS,
  HandleId,
  SELECTION_PADDING,
  containsBounds,
  findElementAt,
  getBounds,
  getCommonBounds,
  getHandles,
  getPathMidpoint,
  hitHandle,
  isLinear,
  newElementId,
  randomSeed,
  resizeElement,
  syncPointBounds,
  translateElement,
} from "./geometry";
import { containerTextColor, createRoughCanvas, drawScene, measureText, renderElementsToCanvas } from "./renderer";
import { StencilItem } from "./technicalPackages";
import { createExampleElements } from "./exampleBoard";
import { downloadBoard, parseBoardFile, readImageFile, serializeBoard } from "./fileIO";
import { Toolbar } from "./ui/Toolbar";
import { MainMenu } from "./ui/MainMenu";
import { LayerAction, PropertiesPanel } from "./ui/PropertiesPanel";
import { WelcomeScreen } from "./ui/WelcomeScreen";
import { LibraryItem, Sidebar, SidebarTab } from "./ui/Sidebar";
import {
  Command,
  CommandPalette,
  ConfirmDialog,
  ExportImageDialog,
  GenerateDialog,
  HelpDialog,
} from "./ui/Dialogs";
import { Icon } from "./ui/icons";
import { IconButton, ISLAND, Kbd } from "./ui/primitives";

import { tr } from "@/i18n/translate";
const STORAGE_KEY_PLANO = "twoffactor_planos_board_v2";
const STORAGE_KEY_LIBRARY = "twoffactor_planos_library_v1";
const GRID_SIZE = 20;
const HISTORY_LIMIT = 100;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

const CONTAINER_TYPES: ElementType[] = ["rectangle", "diamond", "ellipse", "technical", "note"];
const BACKGROUND_TYPES: ElementType[] = ["rectangle", "diamond", "ellipse", "technical"];

const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="#E2E4E9" stroke-width="1.5"/><circle cx="10" cy="10" r="6" fill="none" stroke="#000" stroke-opacity=".4" stroke-width=".5"/></svg>'
)}") 10 10, crosshair`;

type Interaction =
  | { kind: "pan"; last: Point }
  | { kind: "laser" }
  | { kind: "erase" }
  | { kind: "create"; id: string; start: Point }
  | { kind: "move"; start: Point; ids: Set<string>; base: PlanoElement[]; moved: boolean; hitId: string; shift: boolean }
  | { kind: "resize"; id: string; handle: HandleId; original: PlanoElement }
  | { kind: "marquee"; start: Point; base: string[] }
  | { kind: "pinch"; dist: number; mid: Point };

type DialogKind = "help" | "export" | "ai" | "mermaid" | "reset" | "palette";

interface EditingState {
  id: string;
  isNew: boolean;
  originalText: string;
}

function loadBoard(): { elements: PlanoElement[]; grid: boolean; background: string } {
  const fallback = { elements: [], grid: true, background: DEFAULT_CANVAS_BG };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLANO);
    if (!saved) return fallback;
    const parsed = parseBoardFile(saved);
    if (!parsed) return fallback;
    const settings = JSON.parse(saved).settings ?? {};
    return {
      elements: parsed.elements,
      grid: settings.grid ?? true,
      background: parsed.background ?? DEFAULT_CANVAS_BG,
    };
  } catch {
    return fallback;
  }
}

function loadLibrary(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIBRARY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cloneWithNewIds(els: PlanoElement[], dx: number, dy: number): PlanoElement[] {
  return els.map((el) => ({ ...translateElement(el, dx, dy), id: newElementId(), seed: randomSeed() }));
}

function styleFromElement(el: PlanoElement, base: AppStyle): AppStyle {
  return {
    ...base,
    strokeColor: el.strokeColor,
    backgroundColor: el.type === "note" ? base.backgroundColor : el.backgroundColor,
    noteColor: el.type === "note" ? el.backgroundColor : base.noteColor,
    fillStyle: el.fillStyle === "transparent" ? base.fillStyle : el.fillStyle,
    strokeWidth: el.strokeWidth,
    strokeStyle: el.strokeStyle,
    roughness: el.roughness,
    opacity: el.opacity,
    roundness: el.roundness,
    fontFamily: el.fontFamily ?? base.fontFamily,
    fontSize: el.fontSize ?? base.fontSize,
    textAlign: el.textAlign ?? base.textAlign,
    arrowType: el.arrowType ?? "straight",
    startArrowhead: el.startArrowhead ?? "none",
    endArrowhead: el.endArrowhead ?? "arrow",
  };
}

// Applies a properties-panel change to one element, only touching what that element supports
function applyStyleToElement(el: PlanoElement, patch: Partial<AppStyle>): PlanoElement {
  const next: PlanoElement = { ...el };
  if (patch.strokeColor !== undefined) next.strokeColor = patch.strokeColor;
  if (patch.backgroundColor !== undefined && BACKGROUND_TYPES.includes(el.type)) {
    next.backgroundColor = patch.backgroundColor;
    if (patch.backgroundColor !== "transparent" && next.fillStyle === "transparent") next.fillStyle = "hachure";
  }
  if (patch.noteColor !== undefined && el.type === "note") next.backgroundColor = patch.noteColor;
  if (patch.fillStyle !== undefined && BACKGROUND_TYPES.includes(el.type)) next.fillStyle = patch.fillStyle;
  if (patch.strokeWidth !== undefined) next.strokeWidth = patch.strokeWidth;
  if (patch.strokeStyle !== undefined) next.strokeStyle = patch.strokeStyle;
  if (patch.roughness !== undefined) next.roughness = patch.roughness;
  if (patch.opacity !== undefined) next.opacity = patch.opacity;
  if (patch.roundness !== undefined) next.roundness = patch.roundness;
  if (patch.fontFamily !== undefined) next.fontFamily = patch.fontFamily;
  if (patch.fontSize !== undefined) next.fontSize = patch.fontSize;
  if (patch.textAlign !== undefined) next.textAlign = patch.textAlign;
  if (el.type === "arrow") {
    if (patch.arrowType !== undefined) next.arrowType = patch.arrowType;
    if (patch.startArrowhead !== undefined) next.startArrowhead = patch.startArrowhead;
    if (patch.endArrowhead !== undefined) next.endArrowhead = patch.endArrowhead;
  }
  if (el.type === "text" && (patch.fontFamily !== undefined || patch.fontSize !== undefined)) {
    const size = measureText(next.text ?? "", next.fontSize ?? 20, next.fontFamily);
    next.width = size.width;
    next.height = size.height;
  }
  return syncPointBounds(next);
}

function reorder(elements: PlanoElement[], selected: Set<string>, action: LayerAction): PlanoElement[] {
  if (action === "front") {
    return [...elements.filter((el) => !selected.has(el.id)), ...elements.filter((el) => selected.has(el.id))];
  }
  if (action === "back") {
    return [...elements.filter((el) => selected.has(el.id)), ...elements.filter((el) => !selected.has(el.id))];
  }
  const arr = [...elements];
  if (action === "forward") {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (selected.has(arr[i].id) && !selected.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (selected.has(arr[i].id) && !selected.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
    }
  }
  return arr;
}

const TOOL_ELEMENT: Partial<Record<ToolType, ElementType>> = {
  rectangle: "rectangle",
  diamond: "diamond",
  ellipse: "ellipse",
  arrow: "arrow",
  line: "line",
  freedraw: "freedraw",
  text: "text",
  note: "note",
  frame: "frame",
};

export function PlanosBoard() {
  const [initial] = useState(loadBoard);

  // Scene & history
  const [elements, setElements] = useState<PlanoElement[]>(initial.elements);
  const [history, setHistory] = useState<PlanoElement[][]>([initial.elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Camera
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverCursor, setHoverCursor] = useState("");

  // Tools, selection & style
  const [tool, setToolState] = useState<ToolType>("select");
  const [toolLocked, setToolLocked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [appStyle, setAppStyle] = useState<AppStyle>(DEFAULT_STYLE);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [erasingIds, setErasingIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<Bounds | null>(null);
  const [laserPoints, setLaserPoints] = useState<{ x: number; y: number; time: number }[]>([]);

  // Board settings & chrome
  const [gridEnabled, setGridEnabled] = useState(initial.grid);
  const [canvasBg, setCanvasBg] = useState(initial.background);
  const mode = useAdminMode();
  const chrome = CANVAS_CHROME[mode];
  // The stored background is the Forja color; Cristal shows its light counterpart
  const displayBg = themeColor(canvasBg, mode);
  const [zenMode, setZenMode] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(loadLibrary);
  const [renderTick, setRenderTick] = useState(0);
  const [toast, setToast] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roughRef = useRef<RoughCanvas | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  // Fingers currently on the canvas, for two-finger pinch zoom
  const touchPointsRef = useRef(new Map<number, Point>());
  const clipboardRef = useRef<PlanoElement[]>([]);
  const openInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const keyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const keyUpRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});

  const selectedSet = new Set(selectedIds);
  const selectedElements = elements.filter((el) => selectedSet.has(el.id));
  const editingElement = editing ? elements.find((el) => el.id === editing.id) ?? null : null;

  // ------------------------------------------------------------------ persistence & history
  function persist(els: PlanoElement[], settings = { grid: gridEnabled, background: canvasBg }) {
    try {
      localStorage.setItem(STORAGE_KEY_PLANO, serializeBoard(els, settings));
    } catch {
      setToast("No se pudo guardar en el navegador (almacenamiento lleno). Guarda un archivo .plano.");
    }
  }

  function commit(next: PlanoElement[]) {
    setElements(next);
    persist(next);
    const base = history.slice(0, historyIndex + 1);
    const trimmed = base.length >= HISTORY_LIMIT ? base.slice(base.length - HISTORY_LIMIT + 1) : base;
    const nextHistory = [...trimmed, next];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  function goToHistory(index: number) {
    if (index < 0 || index >= history.length) return;
    setEditing(null);
    setHistoryIndex(index);
    setElements(history[index]);
    persist(history[index]);
    setSelectedIds((prev) => prev.filter((id) => history[index].some((el) => el.id === id)));
  }

  const undo = () => goToHistory(historyIndex - 1);
  const redo = () => goToHistory(historyIndex + 1);

  function updateSettings(patch: { grid?: boolean; background?: string }) {
    const settings = { grid: patch.grid ?? gridEnabled, background: patch.background ?? canvasBg };
    if (patch.grid !== undefined) setGridEnabled(patch.grid);
    if (patch.background !== undefined) setCanvasBg(patch.background);
    persist(elements, settings);
  }

  function saveLibrary(items: LibraryItem[]) {
    setLibraryItems(items);
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(items));
    } catch {
      setToast("La biblioteca es demasiado grande para el navegador.");
    }
  }

  // ------------------------------------------------------------------ coordinates
  const toScene = (p: Point): Point => ({ x: p.x / viewport.zoom - viewport.x, y: p.y / viewport.zoom - viewport.y });
  const toScreen = (p: Point): Point => ({ x: (p.x + viewport.x) * viewport.zoom, y: (p.y + viewport.y) * viewport.zoom });

  function getScreenPoint(e: { clientX: number; clientY: number }): Point {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
  }

  const viewCenter = (): Point => toScene({ x: canvasSize.width / 2, y: canvasSize.height / 2 });

  function zoomBy(factor: number, anchor?: Point) {
    const sp = anchor ?? { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    setViewport((v) => {
      const zoom = Math.min(Math.max(v.zoom * factor, MIN_ZOOM), MAX_ZOOM);
      const scene = { x: sp.x / v.zoom - v.x, y: sp.y / v.zoom - v.y };
      return { zoom, x: sp.x / zoom - scene.x, y: sp.y / zoom - scene.y };
    });
  }

  function resetZoom() {
    zoomBy(1 / viewport.zoom);
  }

  function fitToElements(els: PlanoElement[], maxZoom = 2) {
    const b = getCommonBounds(els);
    if (!b || canvasSize.width === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const pad = 80;
    const zoom = Math.min(
      Math.max(Math.min(canvasSize.width / (b.width + pad * 2), canvasSize.height / (b.height + pad * 2)), MIN_ZOOM),
      maxZoom
    );
    setViewport({
      zoom,
      x: (canvasSize.width / zoom - b.width) / 2 - b.x,
      y: (canvasSize.height / zoom - b.height) / 2 - b.y,
    });
  }

  function focusElement(id: string) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setToolState("select");
    setSelectedIds([id]);
    fitToElements([el], Math.max(viewport.zoom, 1));
  }

  // ------------------------------------------------------------------ element factory
  function createElement(type: ElementType, p: Point): PlanoElement {
    const base: PlanoElement = {
      id: newElementId(),
      type,
      x: p.x,
      y: p.y,
      width: 0,
      height: 0,
      angle: 0,
      strokeColor: appStyle.strokeColor,
      backgroundColor: appStyle.backgroundColor,
      fillStyle: appStyle.fillStyle,
      strokeWidth: appStyle.strokeWidth,
      strokeStyle: appStyle.strokeStyle,
      roughness: appStyle.roughness,
      opacity: appStyle.opacity,
      roundness: appStyle.roundness,
      seed: randomSeed(),
      fontFamily: appStyle.fontFamily,
      fontSize: appStyle.fontSize,
      // Labels inside shapes are centered; only free text follows the alignment setting
      textAlign: type === "text" ? appStyle.textAlign : "center",
    };
    switch (type) {
      case "arrow":
      case "line":
        return {
          ...base,
          backgroundColor: "transparent",
          points: [p, p],
          arrowType: type === "arrow" ? appStyle.arrowType : undefined,
          startArrowhead: type === "arrow" ? appStyle.startArrowhead : undefined,
          endArrowhead: type === "arrow" ? appStyle.endArrowhead : undefined,
        };
      case "freedraw":
        return { ...base, backgroundColor: "transparent", points: [p] };
      case "note":
        // Notes always start legible: light ink, centered, regardless of the last shape style
        return {
          ...base,
          strokeColor: STROKE_PALETTE[0].val,
          backgroundColor: appStyle.noteColor,
          fillStyle: "solid",
          textAlign: "center",
          text: "",
        };
      case "frame": {
        const count = elements.filter((el) => el.type === "frame").length + 1;
        return {
          ...base,
          strokeColor: "#B87333",
          backgroundColor: "transparent",
          fillStyle: "transparent",
          strokeWidth: 1,
          name: tr("Marco {n}", { n: count }),
        };
      }
      case "text": {
        const size = measureText("", appStyle.fontSize, appStyle.fontFamily);
        return {
          ...base,
          y: p.y - (appStyle.fontSize * LINE_HEIGHT) / 2,
          backgroundColor: "transparent",
          text: "",
          width: size.width,
          height: size.height,
        };
      }
      default:
        return base;
    }
  }

  // ------------------------------------------------------------------ tools
  function setTool(next: ToolType) {
    if (editing) finishEditing();
    if (next === "image") {
      imageInputRef.current?.click();
      return;
    }
    setToolState(next);
    if (next !== "select") setSelectedIds([]);
    setHoverCursor("");
  }

  // ------------------------------------------------------------------ text editing
  function startEditing(el: PlanoElement, isNew: boolean) {
    setEditing({ id: el.id, isNew, originalText: el.text ?? "" });
    setSelectedIds([]);
  }

  function updateEditingText(text: string) {
    if (!editing) return;
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== editing.id) return el;
        if (el.type !== "text") return { ...el, text };
        const size = measureText(text, el.fontSize ?? 20, el.fontFamily);
        return { ...el, text, width: size.width, height: size.height };
      })
    );
  }

  function finishEditing() {
    if (!editing) return;
    const current = elements.find((el) => el.id === editing.id);
    setEditing(null);
    if (!current) return;
    const text = (current.text ?? "").replace(/\s+$/, "");

    if (current.type === "text" && !text.trim()) {
      const next = elements.filter((el) => el.id !== current.id);
      if (editing.isNew) setElements(next);
      else commit(next);
      return;
    }

    const finalEl =
      current.type === "text"
        ? { ...current, text, ...measureText(text, current.fontSize ?? 20, current.fontFamily) }
        : { ...current, text };
    const next = elements.map((el) => (el.id === current.id ? finalEl : el));
    if (editing.isNew || editing.originalText !== text) commit(next);
    else setElements(next);
    setSelectedIds([current.id]);
    if (current.type === "text" && !toolLocked) setToolState("select");
  }

  // ------------------------------------------------------------------ selection actions
  function deleteSelected() {
    if (selectedIds.length === 0) return;
    commit(elements.filter((el) => !selectedSet.has(el.id)));
    setSelectedIds([]);
  }

  function duplicateSelected() {
    if (selectedElements.length === 0) return;
    const clones = cloneWithNewIds(selectedElements, 16, 16);
    commit([...elements, ...clones]);
    setSelectedIds(clones.map((c) => c.id));
  }

  function copySelected() {
    if (selectedElements.length > 0) clipboardRef.current = selectedElements;
  }

  function paste() {
    if (clipboardRef.current.length === 0) return;
    const b = getCommonBounds(clipboardRef.current);
    const c = viewCenter();
    const clones = b
      ? cloneWithNewIds(clipboardRef.current, c.x - (b.x + b.width / 2), c.y - (b.y + b.height / 2))
      : [];
    commit([...elements, ...clones]);
    setToolState("select");
    setSelectedIds(clones.map((el) => el.id));
  }

  function nudge(dx: number, dy: number) {
    if (selectedIds.length === 0) return;
    commit(elements.map((el) => (selectedSet.has(el.id) ? translateElement(el, dx, dy) : el)));
  }

  function applyLayer(action: LayerAction) {
    if (selectedIds.length === 0) return;
    commit(reorder(elements, selectedSet, action));
  }

  function handleStyleChange(patch: Partial<AppStyle>) {
    setAppStyle((s) => ({ ...s, ...patch }));
    const targets = editing ? [editing.id] : selectedIds;
    if (targets.length === 0) return;
    const ids = new Set(targets);
    const next = elements.map((el) => (ids.has(el.id) ? applyStyleToElement(el, patch) : el));
    if (editing) setElements(next);
    else commit(next);
  }

  // Inserts elements centered in the current view and selects them
  function insertCentered(els: PlanoElement[]) {
    const b = getCommonBounds(els);
    if (!b) return;
    const c = viewCenter();
    const placed = els.map((el) => translateElement(el, c.x - (b.x + b.width / 2), c.y - (b.y + b.height / 2)));
    commit([...elements, ...placed]);
    setToolState("select");
    setSelectedIds(placed.map((el) => el.id));
  }

  function insertStencil(stencil: StencilItem) {
    insertCentered([stencil.createElement(0, 0)]);
  }

  function addSelectionToLibrary() {
    if (selectedElements.length === 0) return;
    const b = getCommonBounds(selectedElements);
    const scale = b ? Math.min(1, 160 / Math.max(b.width, b.height, 1)) : 1;
    const canvas = renderElementsToCanvas(selectedElements, { scale, background: null, padding: 8, mode });
    const named = selectedElements.find((el) => el.text || el.name);
    saveLibrary([
      ...libraryItems,
      {
        id: newElementId("lib"),
        name: (named?.text || named?.name || "Elemento").split("\n")[0].slice(0, 40),
        elements: selectedElements,
        thumbnail: canvas?.toDataURL("image/png") ?? "",
      },
    ]);
    setToast("Añadido a tu biblioteca.");
  }

  // ------------------------------------------------------------------ files
  async function insertImageFile(file: File, at?: Point) {
    try {
      const img = await readImageFile(file);
      const scale = Math.min(1, 420 / Math.max(img.width, img.height));
      const width = img.width * scale;
      const height = img.height * scale;
      const center = at ?? viewCenter();
      const el: PlanoElement = {
        ...createElement("image", { x: center.x - width / 2, y: center.y - height / 2 }),
        backgroundColor: "transparent",
        width,
        height,
        imageData: img.dataUrl,
        roundness: false,
      };
      commit([...elements, el]);
      setToolState("select");
      setSelectedIds([el.id]);
    } catch {
      setToast("No se pudo leer la imagen.");
    }
  }

  function openBoardFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBoardFile(String(reader.result));
      if (!parsed) {
        setToast("Archivo no válido. Debe ser un .plano o .excalidraw.");
        return;
      }
      commit(parsed.elements);
      if (parsed.background) {
        setCanvasBg(parsed.background);
        persist(parsed.elements, { grid: gridEnabled, background: parsed.background });
      }
      setSelectedIds([]);
      fitToElements(parsed.elements);
      setToast(tr("Plano cargado: {count} elementos.", { count: parsed.elements.length }));
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) insertImageFile(file, toScene(getScreenPoint(e)));
    else openBoardFile(file);
  }

  function resetCanvas() {
    commit([]);
    setSelectedIds([]);
    setCanvasBg(DEFAULT_CANVAS_BG);
    persist([], { grid: gridEnabled, background: DEFAULT_CANVAS_BG });
    setViewport({ x: 0, y: 0, zoom: 1 });
  }

  function loadExample() {
    const example = createExampleElements();
    commit([...elements, ...example]);
    fitToElements(example, 1);
  }

  // ------------------------------------------------------------------ pointer interactions
  // Undo whatever the first finger started when a second finger turns the gesture into a pinch
  function cancelInteraction() {
    const it = interactionRef.current;
    interactionRef.current = null;
    if (!it) return;
    if (it.kind === "create") setElements((prev) => prev.filter((el) => el.id !== it.id));
    else if (it.kind === "move") setElements(it.base);
    else if (it.kind === "resize") setElements((prev) => prev.map((el) => (el.id === it.id ? it.original : el)));
    else if (it.kind === "marquee") setMarquee(null);
    else if (it.kind === "pan") setIsPanning(false);
    else if (it.kind === "erase") setErasingIds([]);
  }

  function pinchGeometry(): { dist: number; mid: Point } | null {
    const pts = Array.from(touchPointsRef.current.values());
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (editing) {
      finishEditing();
      return;
    }
    const sp = getScreenPoint(e);
    const p = toScene(sp);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.pointerType === "touch") {
      touchPointsRef.current.set(e.pointerId, sp);
      if (touchPointsRef.current.size >= 2) {
        const geo = pinchGeometry();
        cancelInteraction();
        if (geo) interactionRef.current = { kind: "pinch", ...geo };
        return;
      }
    }

    if (e.button === 1 || tool === "hand" || isSpacePressed) {
      interactionRef.current = { kind: "pan", last: sp };
      setIsPanning(true);
      return;
    }
    if (e.button !== 0) return;

    if (tool === "laser") {
      interactionRef.current = { kind: "laser" };
      setLaserPoints((prev) => [...prev, { ...p, time: Date.now() }]);
      return;
    }

    if (tool === "eraser") {
      interactionRef.current = { kind: "erase" };
      const hit = findElementAt(elements, p, viewport.zoom);
      setErasingIds(hit ? [hit.id] : []);
      return;
    }

    if (tool === "select") {
      if (selectedElements.length === 1) {
        const handle = hitHandle(selectedElements[0], p, viewport.zoom);
        if (handle) {
          interactionRef.current = { kind: "resize", id: selectedElements[0].id, handle, original: selectedElements[0] };
          return;
        }
      }
      const hit = findElementAt(elements, p, viewport.zoom);
      if (!hit) {
        if (!e.shiftKey) setSelectedIds([]);
        interactionRef.current = { kind: "marquee", start: p, base: e.shiftKey ? selectedIds : [] };
        setMarquee({ x: p.x, y: p.y, width: 0, height: 0 });
        return;
      }
      let nextSelection: string[];
      if (e.shiftKey) {
        nextSelection = selectedSet.has(hit.id) ? selectedIds.filter((id) => id !== hit.id) : [...selectedIds, hit.id];
      } else {
        nextSelection = selectedSet.has(hit.id) ? selectedIds : [hit.id];
      }
      setSelectedIds(nextSelection);
      if (!nextSelection.includes(hit.id)) return;

      // Frames drag along everything they contain
      const ids = new Set(nextSelection);
      nextSelection.forEach((id) => {
        const el = elements.find((x) => x.id === id);
        if (el?.type !== "frame") return;
        const fb = getBounds(el);
        elements.forEach((o) => {
          if (o.id !== el.id && containsBounds(fb, getBounds(o))) ids.add(o.id);
        });
      });
      interactionRef.current = { kind: "move", start: p, ids, base: elements, moved: false, hitId: hit.id, shift: e.shiftKey };
      return;
    }

    const type = TOOL_ELEMENT[tool];
    if (!type) return;

    if (type === "text") {
      const el = createElement("text", p);
      setElements([...elements, el]);
      startEditing(el, true);
      return;
    }

    const el = createElement(type, p);
    setElements([...elements, el]);
    interactionRef.current = { kind: "create", id: el.id, start: p };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const sp = getScreenPoint(e);
    const p = toScene(sp);
    if (e.pointerType === "touch" && touchPointsRef.current.has(e.pointerId)) {
      touchPointsRef.current.set(e.pointerId, sp);
    }
    const it = interactionRef.current;

    if (it?.kind === "pinch") {
      const geo = pinchGeometry();
      if (!geo) return;
      const factor = it.dist > 0 ? geo.dist / it.dist : 1;
      const prevMid = it.mid;
      setViewport((v) => {
        const zoom = Math.min(Math.max(v.zoom * factor, MIN_ZOOM), MAX_ZOOM);
        const scene = { x: prevMid.x / v.zoom - v.x, y: prevMid.y / v.zoom - v.y };
        return { zoom, x: geo.mid.x / zoom - scene.x, y: geo.mid.y / zoom - scene.y };
      });
      it.dist = geo.dist;
      it.mid = geo.mid;
      return;
    }

    if (!it) {
      if (tool !== "select" || isSpacePressed) return;
      const handle = selectedElements.length === 1 ? hitHandle(selectedElements[0], p, viewport.zoom) : null;
      const next = handle ? HANDLE_CURSORS[handle] : findElementAt(elements, p, viewport.zoom) ? "move" : "";
      if (next !== hoverCursor) setHoverCursor(next);
      return;
    }

    switch (it.kind) {
      case "pan": {
        const dx = sp.x - it.last.x;
        const dy = sp.y - it.last.y;
        it.last = sp;
        setViewport((v) => ({ ...v, x: v.x + dx / v.zoom, y: v.y + dy / v.zoom }));
        break;
      }
      case "laser":
        setLaserPoints((prev) => [...prev, { ...p, time: Date.now() }]);
        break;
      case "erase": {
        const hit = findElementAt(elements, p, viewport.zoom);
        if (!hit) break;
        if (e.altKey) setErasingIds((prev) => prev.filter((id) => id !== hit.id));
        else if (!erasingIds.includes(hit.id)) setErasingIds((prev) => [...prev, hit.id]);
        break;
      }
      case "move": {
        const dx = p.x - it.start.x;
        const dy = p.y - it.start.y;
        if (Math.abs(dx) + Math.abs(dy) > 0) it.moved = true;
        setElements(it.base.map((el) => (it.ids.has(el.id) ? translateElement(el, dx, dy) : el)));
        break;
      }
      case "resize":
        setElements((prev) =>
          prev.map((el) => (el.id === it.id ? resizeElement(it.original, it.handle, p, e.shiftKey) : el))
        );
        break;
      case "marquee": {
        const rect = {
          x: Math.min(it.start.x, p.x),
          y: Math.min(it.start.y, p.y),
          width: Math.abs(p.x - it.start.x),
          height: Math.abs(p.y - it.start.y),
        };
        setMarquee(rect);
        const inside = elements.filter((el) => containsBounds(rect, getBounds(el))).map((el) => el.id);
        setSelectedIds(Array.from(new Set([...it.base, ...inside])));
        break;
      }
      case "create": {
        const { start } = it;
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== it.id) return el;
            if (el.type === "freedraw") {
              const pts = el.points ?? [];
              const last = pts[pts.length - 1];
              if (last && Math.hypot(last.x - p.x, last.y - p.y) < 1 / viewport.zoom) return el;
              return syncPointBounds({ ...el, points: [...pts, p] });
            }
            if (isLinear(el)) {
              let end = p;
              if (e.shiftKey) {
                const angle = Math.round(Math.atan2(p.y - start.y, p.x - start.x) / (Math.PI / 12)) * (Math.PI / 12);
                const len = Math.hypot(p.x - start.x, p.y - start.y);
                end = { x: start.x + Math.cos(angle) * len, y: start.y + Math.sin(angle) * len };
              }
              return syncPointBounds({ ...el, points: [start, end] });
            }
            let w = p.x - start.x;
            let h = p.y - start.y;
            if (e.shiftKey) {
              const s = Math.max(Math.abs(w), Math.abs(h));
              w = (Math.sign(w) || 1) * s;
              h = (Math.sign(h) || 1) * s;
            }
            return {
              ...el,
              x: Math.min(start.x, start.x + w),
              y: Math.min(start.y, start.y + h),
              width: Math.abs(w),
              height: Math.abs(h),
            };
          })
        );
        break;
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "touch") touchPointsRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const it = interactionRef.current;
    if (it?.kind === "pinch") {
      // The finger left on the canvas after a pinch does not start a new gesture
      if (touchPointsRef.current.size < 2) interactionRef.current = null;
      return;
    }
    interactionRef.current = null;
    if (!it) return;

    switch (it.kind) {
      case "pan":
        setIsPanning(false);
        break;
      case "erase":
        if (erasingIds.length > 0) {
          const erased = new Set(erasingIds);
          commit(elements.filter((el) => !erased.has(el.id)));
          setSelectedIds((prev) => prev.filter((id) => !erased.has(id)));
        }
        setErasingIds([]);
        break;
      case "move":
        if (it.moved) commit(elements);
        else if (!it.shift && selectedIds.length > 1) setSelectedIds([it.hitId]);
        break;
      case "resize":
        commit(elements);
        break;
      case "marquee":
        setMarquee(null);
        break;
      case "create": {
        let el = elements.find((x) => x.id === it.id);
        if (!el) break;
        const others = elements.filter((x) => x.id !== it.id);
        const b = getBounds(el);
        const tiny = b.width < 4 && b.height < 4;

        if (tiny && el.type === "note") {
          el = { ...el, x: el.x - 100, y: el.y - 70, width: 200, height: 140 };
        } else if (tiny && el.type !== "freedraw") {
          setElements(others);
          break;
        }

        commit([...others, el]);
        if (el.type === "note") {
          startEditing(el, false);
        } else if (el.type !== "freedraw") {
          setSelectedIds([el.id]);
        }
        if (!toolLocked && el.type !== "freedraw") setToolState("select");
        break;
      }
    }
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (tool !== "select") return;
    const p = toScene(getScreenPoint(e));
    const hit = findElementAt(elements, p, viewport.zoom);
    if (hit) {
      if (hit.type === "frame") {
        const name = window.prompt(tr("Nombre del marco:"), hit.name ?? tr("Marco"));
        if (name !== null) commit(elements.map((el) => (el.id === hit.id ? { ...el, name } : el)));
        return;
      }
      if (hit.type === "image" || hit.type === "freedraw") return;
      startEditing(hit, false);
      return;
    }
    const el = createElement("text", p);
    setElements([...elements, el]);
    startEditing(el, true);
  }

  // ------------------------------------------------------------------ keyboard & wheel
  function handleKeyDown(e: KeyboardEvent) {
    if (dialog) return;
    const target = e.target as HTMLElement | null;
    if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;

    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (e.code === "Space") {
      if (!isSpacePressed) setIsSpacePressed(true);
      handled();
      return;
    }

    if (mod) {
      if (key === "z") {
        handled();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        handled();
        redo();
      } else if (key === "a") {
        handled();
        setToolState("select");
        setSelectedIds(elements.map((el) => el.id));
      } else if (key === "d") {
        handled();
        duplicateSelected();
      } else if (key === "c") {
        copySelected();
      } else if (key === "x") {
        copySelected();
        deleteSelected();
      } else if (key === "v") {
        handled();
        paste();
      } else if (key === "o") {
        handled();
        openInputRef.current?.click();
      } else if (key === "s") {
        handled();
        downloadBoard(elements, { grid: gridEnabled, background: canvasBg });
      } else if (key === "e" && e.shiftKey) {
        handled();
        setDialog("export");
      } else if (key === "/") {
        handled();
        setDialog("palette");
      } else if (key === "f") {
        handled();
        setSidebarTab("search");
      } else if (key === "=" || key === "+") {
        handled();
        zoomBy(1.2);
      } else if (key === "-") {
        handled();
        zoomBy(1 / 1.2);
      } else if (key === "0") {
        handled();
        resetZoom();
      } else if (key === "'") {
        handled();
        updateSettings({ grid: !gridEnabled });
      } else if (e.code === "BracketRight") {
        handled();
        applyLayer(e.shiftKey ? "front" : "forward");
      } else if (e.code === "BracketLeft") {
        handled();
        applyLayer(e.shiftKey ? "back" : "backward");
      }
      return;
    }

    if (e.altKey) {
      if (key === "z") {
        handled();
        setZenMode(!zenMode);
      }
      return;
    }

    if (e.shiftKey && e.code === "Digit1") {
      handled();
      fitToElements(elements);
      return;
    }
    if (e.shiftKey && e.code === "Digit2") {
      handled();
      fitToElements(selectedElements.length > 0 ? selectedElements : elements);
      return;
    }

    if (key === "delete" || key === "backspace") {
      handled();
      deleteSelected();
      return;
    }
    if (key === "escape") {
      if (selectedIds.length > 0) setSelectedIds([]);
      else if (tool !== "select") setToolState("select");
      else if (sidebarTab) setSidebarTab(null);
      else if (zenMode) setZenMode(false);
      else return; // let the admin panel handle it
      handled();
      return;
    }
    if (key.startsWith("arrow")) {
      if (selectedIds.length === 0) return;
      handled();
      const step = e.shiftKey ? 10 : 1;
      nudge(
        key === "arrowleft" ? -step : key === "arrowright" ? step : 0,
        key === "arrowup" ? -step : key === "arrowdown" ? step : 0
      );
      return;
    }
    if (e.key === "?") {
      handled();
      setDialog("help");
      return;
    }

    const toolKeys: Record<string, ToolType> = {
      v: "select",
      "1": "select",
      h: "hand",
      r: "rectangle",
      "2": "rectangle",
      d: "diamond",
      "3": "diamond",
      o: "ellipse",
      "4": "ellipse",
      a: "arrow",
      "5": "arrow",
      l: "line",
      "6": "line",
      p: "freedraw",
      "7": "freedraw",
      t: "text",
      "8": "text",
      n: "note",
      "9": "image",
      e: "eraser",
      "0": "eraser",
      f: "frame",
      k: "laser",
    };
    if (key === "q") {
      handled();
      setToolLocked(!toolLocked);
      return;
    }
    const nextTool = toolKeys[key];
    if (nextTool) {
      handled();
      if (nextTool === "arrow" && tool === "arrow") {
        const order = ["straight", "curved", "elbow"] as const;
        const arrowType = order[(order.indexOf(appStyle.arrowType) + 1) % order.length];
        setAppStyle((s) => ({ ...s, arrowType }));
        setToast(tr("Tipo de flecha: {type}", { type: tr(arrowType === "straight" ? "recta" : arrowType === "curved" ? "curva" : "codo") }));
        return;
      }
      setTool(nextTool);
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") setIsSpacePressed(false);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (editing) finishEditing();
    if (e.ctrlKey || e.metaKey) {
      const delta = Math.max(-40, Math.min(40, e.deltaY));
      zoomBy(Math.pow(0.995, delta), getScreenPoint(e));
      return;
    }
    const dx = e.shiftKey ? e.deltaY : e.deltaX;
    const dy = e.shiftKey ? 0 : e.deltaY;
    setViewport((v) => ({ ...v, x: v.x - dx / v.zoom, y: v.y - dy / v.zoom }));
  }

  // Window listeners always call the latest handlers
  useEffect(() => {
    keyDownRef.current = handleKeyDown;
    keyUpRef.current = handleKeyUp;
    wheelRef.current = handleWheel;
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => keyDownRef.current(e);
    const up = (e: KeyboardEvent) => keyUpRef.current(e);
    const blur = () => setIsSpacePressed(false);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    const canvas = canvasRef.current;
    const wheel = (e: WheelEvent) => wheelRef.current(e);
    canvas?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
      canvas?.removeEventListener("wheel", wheel);
    };
  }, []);

  // ------------------------------------------------------------------ canvas sizing, fonts & animation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const families = (["hand", "sans", "mono"] as const).map((f) => document.fonts?.load(`20px ${getFontStack(f)}`));
    Promise.allSettled(families).then(() => !cancelled && setRenderTick((t) => t + 1));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (laserPoints.length === 0) return;
    const frame = requestAnimationFrame(() => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((pt) => now - pt.time < 900));
    });
    return () => cancelAnimationFrame(frame);
  }, [laserPoints]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Focus on the next frame: the click that created the text would otherwise steal focus back
  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  // ------------------------------------------------------------------ render
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvasSize.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pixelW = Math.round(canvasSize.width * dpr);
    const pixelH = Math.round(canvasSize.height * dpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }
    if (!roughRef.current) roughRef.current = createRoughCanvas(canvas);
    const { zoom } = viewport;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = displayBg;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(viewport.x, viewport.y);

    // Blueprint grid
    if (gridEnabled && zoom > 0.25) {
      const startX = Math.floor(-viewport.x / GRID_SIZE) * GRID_SIZE;
      const startY = Math.floor(-viewport.y / GRID_SIZE) * GRID_SIZE;
      const endX = -viewport.x + canvasSize.width / zoom;
      const endY = -viewport.y + canvasSize.height / zoom;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += GRID_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.strokeStyle = chrome.gridLine;
      ctx.stroke();
      ctx.fillStyle = chrome.gridDot;
      const major = GRID_SIZE * 5;
      for (let mx = Math.floor(startX / major) * major; mx <= endX; mx += major) {
        for (let my = Math.floor(startY / major) * major; my <= endY; my += major) {
          ctx.beginPath();
          ctx.arc(mx, my, 1.5 / zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawScene(ctx, roughRef.current, elements, {
      zoom,
      canvasBg: displayBg,
      mode,
      erasingIds: new Set(erasingIds),
      hiddenTextId: editing?.id,
      onAssetLoad: () => setRenderTick((t) => t + 1),
    });

    // Selection outlines & handles
    const sel = elements.filter((el) => selectedIds.includes(el.id));
    ctx.strokeStyle = chrome.selection;
    ctx.lineWidth = 1.2 / zoom;
    const pad = SELECTION_PADDING / zoom;
    sel.forEach((el) => {
      const b = getBounds(el);
      ctx.setLineDash(sel.length > 1 ? [3 / zoom, 3 / zoom] : []);
      if (isLinear(el) && sel.length === 1) return;
      ctx.strokeRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
    });
    if (sel.length > 1) {
      const b = getCommonBounds(sel);
      if (b) {
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(b.x - pad * 2, b.y - pad * 2, b.width + pad * 4, b.height + pad * 4);
      }
    }
    ctx.setLineDash([]);
    if (sel.length === 1) {
      const size = 8 / zoom;
      getHandles(sel[0], zoom).forEach((h) => {
        ctx.fillStyle = displayBg;
        ctx.beginPath();
        if (h.id === "start" || h.id === "end") ctx.arc(h.x, h.y, size / 1.6, 0, Math.PI * 2);
        else if (ctx.roundRect) ctx.roundRect(h.x - size / 2, h.y - size / 2, size, size, 2 / zoom);
        else ctx.rect(h.x - size / 2, h.y - size / 2, size, size);
        ctx.fill();
        ctx.stroke();
      });
    }

    if (marquee) {
      ctx.fillStyle = chrome.marqueeFill;
      ctx.fillRect(marquee.x, marquee.y, marquee.width, marquee.height);
      ctx.strokeStyle = chrome.marqueeStroke;
      ctx.strokeRect(marquee.x, marquee.y, marquee.width, marquee.height);
    }

    // Laser trail
    if (laserPoints.length > 1) {
      const now = Date.now();
      ctx.lineCap = "round";
      ctx.shadowColor = "#EF4444";
      ctx.shadowBlur = 12;
      for (let i = 1; i < laserPoints.length; i++) {
        const a = laserPoints[i - 1];
        const b = laserPoints[i];
        const life = Math.max(0, 1 - (now - b.time) / 900);
        ctx.strokeStyle = `rgba(239, 68, 68, ${life})`;
        ctx.lineWidth = (2 + life * 3) / zoom;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }, [
    elements,
    viewport,
    canvasSize,
    displayBg,
    mode,
    chrome,
    gridEnabled,
    selectedIds,
    erasingIds,
    marquee,
    laserPoints,
    editing,
    renderTick,
  ]);

  // ------------------------------------------------------------------ derived UI state
  const panelKinds: ElementType[] = editingElement
    ? [editingElement.type]
    : selectedElements.length > 0
      ? Array.from(new Set(selectedElements.map((el) => el.type)))
      : TOOL_ELEMENT[tool]
        ? [TOOL_ELEMENT[tool] as ElementType]
        : [];
  const panelSource = editingElement ?? selectedElements[0];
  const panelValues = panelSource ? styleFromElement(panelSource, appStyle) : appStyle;

  const panHint = (
    <>
      {tr("Para mover el lienzo, mantén pulsada la")} <Kbd>{tr("rueda del ratón")}</Kbd> o <Kbd>{tr("Espacio")}</Kbd> {tr("mientras arrastras, o usa la herramienta de mano")}
    </>
  );
  const hints: Partial<Record<ToolType, React.ReactNode>> = {
    hand: panHint,
    select: elements.length === 0 ? panHint : null,
    arrow: (
      <>
        {tr("Haz clic y arrastra para dibujar la flecha. Pulsa")} <Kbd>A</Kbd> {tr("de nuevo para cambiar el tipo de flecha")}
      </>
    ),
    line: (
      <>
        {tr("Haz clic y arrastra para dibujar una línea. Mantén")} <Kbd>{tr("Shift")}</Kbd> {tr("para fijar el ángulo")}
      </>
    ),
    freedraw: "Haz clic y arrastra, suelta al terminar",
    text: "Consejo: también puedes añadir texto haciendo doble clic en cualquier lugar con la herramienta de selección",
    note: "Haz clic para colocar una nota o arrastra para darle tamaño",
    eraser: (
      <>
        {tr("Mantén pulsado")} <Kbd>{tr("Alt")}</Kbd> {tr("para revertir los elementos marcados para su eliminación")}
      </>
    ),
    frame: "Arrastra para crear un marco. Los elementos que contenga se moverán con él",
    laser: "Mantén pulsado y arrastra para señalar; el trazo se desvanece solo",
  };
  const hint = editing ? (
    <>
      {tr("Pulsa")} <Kbd>{tr("Esc")}</Kbd> o <Kbd>{tr("Ctrl+Enter")}</Kbd> {tr("para terminar de editar")}
    </>
  ) : (
    hints[tool] ?? null
  );

  const canvasCursor = isPanning
    ? "grabbing"
    : tool === "hand" || isSpacePressed
      ? "grab"
      : tool === "select"
        ? hoverCursor || "default"
        : tool === "text"
          ? "text"
          : tool === "eraser"
            ? ERASER_CURSOR
            : "crosshair";

  const commands: Command[] = [
    ...(
      [
        ["select", "Selección", "pointer", "V"],
        ["hand", "Mano", "hand", "H"],
        ["rectangle", "Rectángulo", "square", "R"],
        ["diamond", "Rombo", "diamond", "D"],
        ["ellipse", "Elipse", "circle", "O"],
        ["arrow", "Flecha", "arrow", "A"],
        ["line", "Línea", "line", "L"],
        ["freedraw", "Lápiz", "pencil", "P"],
        ["text", "Texto", "text", "T"],
        ["note", "Nota", "note", "N"],
        ["image", "Insertar imagen", "image", "9"],
        ["eraser", "Borrador", "eraser", "E"],
        ["frame", "Marco", "frame", "F"],
        ["laser", "Puntero láser", "laser", "K"],
      ] as const
    ).map(([id, label, icon, shortcut]) => ({
      id: `tool-${id}`,
      label,
      category: "Herramienta",
      icon,
      shortcut,
      run: () => setTool(id),
    })),
    { id: "undo", label: "Deshacer", category: "Editor", icon: "undo", shortcut: "Ctrl+Z", run: undo },
    { id: "redo", label: "Rehacer", category: "Editor", icon: "redo", shortcut: "Ctrl+Y", run: redo },
    {
      id: "select-all",
      label: "Seleccionar todo",
      category: "Editor",
      shortcut: "Ctrl+A",
      run: () => setSelectedIds(elements.map((el) => el.id)),
    },
    { id: "duplicate", label: "Duplicar selección", category: "Editor", icon: "duplicate", shortcut: "Ctrl+D", run: duplicateSelected },
    { id: "delete", label: "Eliminar selección", category: "Editor", icon: "trash", shortcut: "Supr", run: deleteSelected },
    {
      id: "open",
      label: "Abrir archivo .plano",
      category: "Archivo",
      icon: "folder",
      shortcut: "Ctrl+O",
      run: () => openInputRef.current?.click(),
    },
    {
      id: "save",
      label: "Guardar en archivo .plano",
      category: "Archivo",
      icon: "download",
      shortcut: "Ctrl+S",
      run: () => downloadBoard(elements, { grid: gridEnabled, background: canvasBg }),
    },
    { id: "export", label: "Exportar imagen", category: "Archivo", icon: "exportImage", shortcut: "Ctrl+Shift+E", run: () => setDialog("export") },
    { id: "find", label: "Encontrar en lienzo", category: "Vista", icon: "search", shortcut: "Ctrl+F", run: () => setSidebarTab("search") },
    { id: "library", label: "Biblioteca y paquetes técnicos", category: "Vista", icon: "library", run: () => setSidebarTab("library") },
    { id: "ai", label: "Texto a diagrama (IA local)", category: "Generar", icon: "sparkles", run: () => setDialog("ai") },
    { id: "mermaid", label: "Mermaid a diagrama", category: "Generar", icon: "mermaid", run: () => setDialog("mermaid") },
    { id: "fit", label: "Ajustar todo", category: "Vista", shortcut: "Shift+1", run: () => fitToElements(elements) },
    { id: "zoom-reset", label: "Restablecer zoom", category: "Vista", shortcut: "Ctrl+0", run: resetZoom },
    {
      id: "grid",
      label: gridEnabled ? "Ocultar cuadrícula" : "Mostrar cuadrícula",
      category: "Vista",
      icon: "grid",
      shortcut: "Ctrl+'",
      run: () => updateSettings({ grid: !gridEnabled }),
    },
    {
      id: "zen",
      label: zenMode ? "Salir del modo Zen" : "Modo Zen",
      category: "Vista",
      icon: "zen",
      shortcut: "Alt+Z",
      run: () => setZenMode(!zenMode),
    },
    {
      id: "lock",
      label: toolLocked ? "Desbloquear herramienta" : "Bloquear herramienta",
      category: "Editor",
      icon: "lock",
      shortcut: "Q",
      run: () => setToolLocked(!toolLocked),
    },
    { id: "example", label: "Cargar plano de ejemplo", category: "Archivo", icon: "example", run: loadExample },
    { id: "help", label: "Ayuda y atajos", category: "Ayuda", icon: "help", shortcut: "?", run: () => setDialog("help") },
    { id: "reset", label: "Limpiar lienzo", category: "Archivo", icon: "trash", run: () => setDialog("reset") },
  ];

  // Inline text editor geometry (screen space, relative to the board)
  let editorStyle: React.CSSProperties | null = null;
  if (editingElement) {
    const el = editingElement;
    const z = viewport.zoom;
    const fontSize = (el.fontSize ?? 20) * z;
    const lineCount = Math.max((el.text ?? "").split("\n").length, 1);
    const common: React.CSSProperties = {
      fontFamily: getFontStack(el.fontFamily),
      fontSize,
      lineHeight: LINE_HEIGHT,
      color: containerTextColor(el, mode),
      textAlign: el.textAlign ?? (isLinear(el) ? "center" : "left"),
    };
    if (el.type === "text") {
      const tl = toScreen({ x: el.x, y: el.y });
      editorStyle = { ...common, left: tl.x, top: tl.y, width: el.width * z + fontSize, height: el.height * z + 4 };
    } else if (isLinear(el)) {
      const mid = toScreen(getPathMidpoint(el));
      const w = 220 * z;
      const h = lineCount * fontSize * LINE_HEIGHT + 8;
      editorStyle = {
        ...common,
        left: mid.x - w / 2,
        top: mid.y - h / 2,
        width: w,
        height: h,
        textAlign: "center",
        background: displayBg,
      };
    } else if (CONTAINER_TYPES.includes(el.type)) {
      const tl = toScreen({ x: el.x, y: el.y });
      const w = el.width * z;
      const h = el.height * z;
      const padX = (el.type === "diamond" ? el.width * 0.18 : 10) * z;
      const padY = Math.max(4, (h - lineCount * fontSize * LINE_HEIGHT) / 2);
      editorStyle = {
        ...common,
        left: tl.x,
        top: tl.y,
        width: w,
        height: h,
        padding: `${padY}px ${padX}px 0`,
        textAlign: el.textAlign ?? "center",
      };
    }
  }

  const isEmpty = elements.length === 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex-1 select-none overflow-hidden font-sans ${
        zenMode ? "fixed inset-0 z-50" : "h-full min-h-[560px] rounded-xl border border-(color:--tf-B87333-cobre)/40"
      }`}
      style={{ backgroundColor: displayBg }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 block h-full w-full touch-none"
        style={{ cursor: canvasCursor }}
      />

      {isEmpty && !editing && (
        <WelcomeScreen
          showToolbarHint={tool === "select"}
          onOpen={() => openInputRef.current?.click()}
          onHelp={() => setDialog("help")}
          onLibrary={() => setSidebarTab("library")}
          onTextToDiagram={() => setDialog("ai")}
          onLoadExample={loadExample}
        />
      )}

      {editing && editorStyle && editingElement && (
        <textarea
          ref={textareaRef}
          value={editingElement.text ?? ""}
          onChange={(e) => updateEditingText(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
              e.preventDefault();
              finishEditing();
            }
          }}
          spellCheck={false}
          wrap={editingElement.type === "text" ? "off" : "soft"}
          className="absolute z-20 resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent p-0 outline-none"
          style={editorStyle}
        />
      )}

      <MainMenu
        canvasBg={canvasBg}
        onCanvasBgChange={(color) => updateSettings({ background: color })}
        gridEnabled={gridEnabled}
        onToggleGrid={() => updateSettings({ grid: !gridEnabled })}
        zenMode={zenMode}
        onToggleZen={() => setZenMode(!zenMode)}
        toolLocked={toolLocked}
        onToggleLock={() => setToolLocked(!toolLocked)}
        onOpen={() => openInputRef.current?.click()}
        onSave={() => downloadBoard(elements, { grid: gridEnabled, background: canvasBg })}
        onExportImage={() => setDialog("export")}
        onCommandPalette={() => setDialog("palette")}
        onFind={() => setSidebarTab("search")}
        onHelp={() => setDialog("help")}
        onReset={() => setDialog("reset")}
      />

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        toolLocked={toolLocked}
        onToggleLock={() => setToolLocked(!toolLocked)}
        hint={hint}
        onInsertImage={() => imageInputRef.current?.click()}
        onTextToDiagram={() => setDialog("ai")}
        onMermaid={() => setDialog("mermaid")}
        onOpenLibrary={() => setSidebarTab("library")}
      />

      {!zenMode && panelKinds.length > 0 && (
        <PropertiesPanel
          kinds={panelKinds}
          values={panelValues}
          onChange={handleStyleChange}
          hasSelection={selectedIds.length > 0}
          onLayer={applyLayer}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />
      )}

      {sidebarTab ? (
        <Sidebar
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          onClose={() => setSidebarTab(null)}
          elements={elements}
          onFocusElement={focusElement}
          hasSelection={selectedIds.length > 0}
          libraryItems={libraryItems}
          onAddSelection={addSelectionToLibrary}
          onInsertLibraryItem={(item) => insertCentered(cloneWithNewIds(item.elements, 0, 0))}
          onRemoveLibraryItem={(id) => saveLibrary(libraryItems.filter((item) => item.id !== id))}
          onInsertStencil={insertStencil}
        />
      ) : (
        <div className="absolute right-3 top-3 z-30">
          <button
            type="button"
            title={tr("Biblioteca y paquetes técnicos")}
            onClick={() => setSidebarTab("library")}
            className={`${ISLAND} flex h-[42px] items-center gap-2 px-3 text-[12px] font-semibold text-(color:--tf-C0C0C0-plata) transition-colors hover:text-(color:--tf-white)`}
          >
            <Icon name="library" />
            <span className="hidden xl:inline">{tr("Biblioteca")}</span>
          </button>
        </div>
      )}

      {/* Bottom-left: zoom & history */}
      <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2">
        <div className={`${ISLAND} flex items-center p-0.5`}>
          <IconButton size="sm" icon="minus" title={tr("Alejar — Ctrl -")} onClick={() => zoomBy(1 / 1.2)} />
          <button
            type="button"
            title={tr("Restablecer zoom — Ctrl 0")}
            onClick={resetZoom}
            className="min-w-[56px] rounded-lg px-1 py-1.5 font-mono text-[12px] text-(color:--tf-E5A93C-laton) hover:bg-(color:--tf-white)/5"
          >
            {Math.round(viewport.zoom * 100)}%
          </button>
          <IconButton size="sm" icon="plus" title={tr("Acercar — Ctrl +")} onClick={() => zoomBy(1.2)} />
        </div>
        <div className={`${ISLAND} flex items-center p-0.5`}>
          <IconButton size="sm" icon="undo" title={tr("Deshacer — Ctrl+Z")} disabled={historyIndex <= 0} onClick={undo} />
          <IconButton
            size="sm"
            icon="redo"
            title={tr("Rehacer — Ctrl+Y")}
            disabled={historyIndex >= history.length - 1}
            onClick={redo}
          />
        </div>
      </div>

      {/* Bottom-right: help */}
      <div className="absolute bottom-3 right-3 z-30">
        <div className={`${ISLAND} p-0.5`}>
          <IconButton size="sm" icon="help" title={tr("Ayuda — ?")} onClick={() => setDialog("help")} />
        </div>
      </div>

      {toast && (
        <div className={`${ISLAND} absolute bottom-16 left-1/2 z-40 -translate-x-1/2 px-4 py-2 text-[12px] text-(color:--tf-E5A93C-laton)`}>
          {tr(toast)}
        </div>
      )}

      <input
        ref={openInputRef}
        type="file"
        accept=".plano,.json,.excalidraw"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) openBoardFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImageFile(file);
          e.target.value = "";
        }}
      />

      {dialog === "help" && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog === "export" && (
        <ExportImageDialog
          elements={elements}
          selectedIds={selectedIds}
          canvasBg={displayBg}
          onClose={() => setDialog(null)}
        />
      )}
      {(dialog === "ai" || dialog === "mermaid") && (
        <GenerateDialog
          initialMode={dialog === "ai" ? "ai" : "mermaid"}
          onClose={() => setDialog(null)}
          getInsertPoint={() => {
            const c = viewCenter();
            return { x: c.x - 380, y: c.y - 120 };
          }}
          onInsert={(els) => {
            commit([...elements, ...els]);
            setToolState("select");
            setSelectedIds(els.map((el) => el.id));
          }}
        />
      )}
      {dialog === "reset" && (
        <ConfirmDialog
          title={tr("Limpiar lienzo")}
          message={tr("Se borrarán todos los elementos del plano y se restablecerá el color de fondo. Puedes deshacerlo con Ctrl+Z mientras no recargues la página.")}
          confirmLabel={tr("Limpiar lienzo")}
          onConfirm={resetCanvas}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "palette" && <CommandPalette commands={commands} onClose={() => setDialog(null)} />}
    </div>
  );
}
