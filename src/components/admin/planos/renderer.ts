import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Drawable, Options } from "roughjs/bin/core";
import type { PlanoElement, Point } from "./types";
import {
  FRAME_LABEL_HEIGHT,
  getCommonBounds,
  getCurveControl,
  getLinearPath,
  getPathMidpoint,
} from "./geometry";
import { CANVAS_CHROME, LINE_HEIGHT, getFontStack, themeColor } from "./theme";
import type { AdminMode } from "../adminMode";
import { tr } from "@/i18n/translate";

const generator = rough.generator();

// Drawables are cached per element object and mode; edits create new objects, which invalidates them
const shapeCaches: Record<AdminMode, WeakMap<PlanoElement, Drawable[]>> = {
  forja: new WeakMap(),
  cristal: new WeakMap(),
};
const imageCache = new Map<string, HTMLImageElement>();

export interface SceneOptions {
  zoom: number;
  canvasBg: string;
  mode?: AdminMode;
  erasingIds?: Set<string>;
  hiddenTextId?: string | null;
  onAssetLoad?: () => void;
}

function seedOf(el: PlanoElement): number {
  if (el.seed) return el.seed;
  let h = 0;
  for (let i = 0; i < el.id.length; i++) h = (h * 31 + el.id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function roughOptions(el: PlanoElement, mode: AdminMode): Options {
  const dashed = el.strokeStyle === "dashed";
  const dotted = el.strokeStyle === "dotted";
  const hasFill = el.backgroundColor !== "transparent" && el.fillStyle !== "transparent";
  return {
    seed: seedOf(el),
    stroke: themeColor(el.strokeColor, mode),
    strokeWidth: el.strokeWidth,
    roughness: el.roughness === 2 ? 2.5 : el.roughness,
    bowing: el.roughness === 0 ? 0 : 1,
    fill: hasFill ? themeColor(el.backgroundColor, mode) : undefined,
    fillStyle: el.fillStyle === "transparent" ? "solid" : el.fillStyle,
    fillWeight: el.strokeWidth / 2,
    hachureGap: el.strokeWidth * 4,
    strokeLineDash: dashed ? [8, 8 + el.strokeWidth] : dotted ? [1.5, 6 + el.strokeWidth] : undefined,
    disableMultiStroke: dashed || dotted || el.roughness === 0,
    preserveVertices: el.roughness < 2,
  };
}

function cornerRadius(w: number, h: number): number {
  return Math.min(Math.max(Math.min(Math.abs(w), Math.abs(h)) * 0.12, 4), 18);
}

function roundedPolygonPath(pts: Point[], r: number): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const lenPrev = Math.hypot(prev.x - cur.x, prev.y - cur.y) || 1;
    const lenNext = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    const tPrev = Math.min(r / lenPrev, 0.5);
    const tNext = Math.min(r / lenNext, 0.5);
    const a = { x: cur.x + (prev.x - cur.x) * tPrev, y: cur.y + (prev.y - cur.y) * tPrev };
    const b = { x: cur.x + (next.x - cur.x) * tNext, y: cur.y + (next.y - cur.y) * tNext };
    d += `${i === 0 ? "M" : "L"} ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y} `;
  }
  return `${d}Z`;
}

function rectPoints(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function arrowheadLines(tip: Point, from: Point, size: number): [Point, Point] {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const spread = Math.PI / 7;
  return [
    { x: tip.x - size * Math.cos(angle - spread), y: tip.y - size * Math.sin(angle - spread) },
    { x: tip.x - size * Math.cos(angle + spread), y: tip.y - size * Math.sin(angle + spread) },
  ];
}

function generateShape(el: PlanoElement, mode: AdminMode): Drawable[] {
  const cache = shapeCaches[mode];
  const cached = cache.get(el);
  if (cached) return cached;

  const o = roughOptions(el, mode);
  const { x, y, width: w, height: h } = el;
  let out: Drawable[] = [];

  if (el.type === "rectangle" || el.type === "technical") {
    out = [
      el.roundness
        ? generator.path(roundedPolygonPath(rectPoints(x, y, w, h), cornerRadius(w, h)), o)
        : generator.rectangle(x, y, w, h, o),
    ];
  } else if (el.type === "note") {
    const noteOpts: Options = { ...o, stroke: "none", fill: themeColor(el.backgroundColor, mode), fillStyle: "solid" };
    out = [
      el.roundness
        ? generator.path(roundedPolygonPath(rectPoints(x, y, w, h), cornerRadius(w, h)), noteOpts)
        : generator.rectangle(x, y, w, h, noteOpts),
    ];
  } else if (el.type === "diamond") {
    const pts = [
      { x: x + w / 2, y },
      { x: x + w, y: y + h / 2 },
      { x: x + w / 2, y: y + h },
      { x, y: y + h / 2 },
    ];
    out = [
      el.roundness
        ? generator.path(roundedPolygonPath(pts, cornerRadius(w, h)), o)
        : generator.polygon(pts.map((p) => [p.x, p.y] as [number, number]), o),
    ];
  } else if (el.type === "ellipse") {
    out = [generator.ellipse(x + w / 2, y + h / 2, w, h, o)];
  } else if (el.type === "arrow" || el.type === "line") {
    const pts = el.points ?? [];
    if (pts.length >= 2) {
      const lineOpts: Options = { ...o, fill: undefined };
      const a = pts[0];
      const b = pts[pts.length - 1];
      if (el.type === "arrow" && el.arrowType === "curved") {
        const c = getCurveControl(a, b);
        out.push(generator.path(`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`, lineOpts));
      } else {
        out.push(generator.linearPath(getLinearPath(el).map((p) => [p.x, p.y] as [number, number]), lineOpts));
      }

      if (el.type === "arrow") {
        const path = getLinearPath(el);
        const total = Math.hypot(b.x - a.x, b.y - a.y);
        const size = Math.min(14 + el.strokeWidth * 3, Math.max(total / 3, 6));
        const headOpts: Options = { ...lineOpts, strokeLineDash: undefined };
        const heads: [Point, Point][] = [];
        if (el.endArrowhead !== "none") heads.push([path[path.length - 1], path[path.length - 2]]);
        if (el.startArrowhead === "arrow") heads.push([path[0], path[1]]);
        heads.forEach(([tip, from]) => {
          const [l, r] = arrowheadLines(tip, from, size);
          out.push(generator.line(tip.x, tip.y, l.x, l.y, headOpts));
          out.push(generator.line(tip.x, tip.y, r.x, r.y, headOpts));
        });
      }
    }
  }

  cache.set(el, out);
  return out;
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  text.split("\n").forEach((paragraph) => {
    const words = paragraph.split(" ");
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    out.push(line);
  });
  return out;
}

let measureCtx: CanvasRenderingContext2D | null = null;

// Size of a free text element for the given content and font
export function measureText(
  text: string,
  fontSize: number,
  fontFamily: PlanoElement["fontFamily"]
): { width: number; height: number } {
  if (!measureCtx && typeof document !== "undefined") {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  const lines = (text || " ").split("\n");
  if (!measureCtx) return { width: 100, height: lines.length * fontSize * LINE_HEIGHT };
  measureCtx.font = `${fontSize}px ${getFontStack(fontFamily)}`;
  const width = Math.max(...lines.map((l) => measureCtx!.measureText(l || " ").width));
  return { width: Math.ceil(width) + 2, height: lines.length * fontSize * LINE_HEIGHT };
}

export function containerTextColor(el: PlanoElement, mode: AdminMode): string {
  return themeColor(el.type === "technical" ? "#F5F5F5" : el.strokeColor, mode);
}

function drawContainerText(ctx: CanvasRenderingContext2D, el: PlanoElement, mode: AdminMode) {
  if (!el.text) return;
  const fontSize = el.fontSize || 16;
  const padding = el.type === "diamond" ? el.width * 0.18 : 10;
  ctx.font = `${fontSize}px ${getFontStack(el.fontFamily)}`;
  ctx.fillStyle = containerTextColor(el, mode);
  ctx.textBaseline = "middle";
  const align = el.textAlign || "center";
  ctx.textAlign = align;
  const lines = wrapLines(ctx, el.text, Math.max(el.width - padding * 2, 10));
  const lh = fontSize * LINE_HEIGHT;
  const startY = el.y + el.height / 2 - (lines.length * lh) / 2 + lh / 2;
  const tx =
    align === "left" ? el.x + padding : align === "right" ? el.x + el.width - padding : el.x + el.width / 2;
  lines.forEach((line, i) => ctx.fillText(line, tx, startY + i * lh));
}

function getImage(src: string, onLoad?: () => void): HTMLImageElement | null {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => onLoad?.();
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function traceRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawElement(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  el: PlanoElement,
  opts: SceneOptions
) {
  const mode = opts.mode ?? "forja";
  const ink = (c: string) => themeColor(c, mode);
  ctx.save();
  ctx.globalAlpha = ((el.opacity ?? 100) / 100) * (opts.erasingIds?.has(el.id) ? 0.2 : 1);
  const textHidden = opts.hiddenTextId === el.id;

  switch (el.type) {
    case "rectangle":
    case "diamond":
    case "ellipse":
    case "technical": {
      generateShape(el, mode).forEach((d) => rc.draw(d));
      if (!textHidden) drawContainerText(ctx, el, mode);
      break;
    }
    case "note": {
      ctx.save();
      ctx.shadowColor = CANVAS_CHROME[mode].noteShadow;
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = ink(el.backgroundColor);
      traceRoundedRect(ctx, el.x, el.y, el.width, el.height, el.roundness ? cornerRadius(el.width, el.height) : 0);
      ctx.fill();
      ctx.restore();
      generateShape(el, mode).forEach((d) => rc.draw(d));
      // Folded corner
      const fold = Math.min(18, el.width / 6, el.height / 6);
      ctx.fillStyle = mode === "cristal" ? "rgba(15,58,95,0.06)" : "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.moveTo(el.x + el.width - fold, el.y + el.height);
      ctx.lineTo(el.x + el.width, el.y + el.height - fold);
      ctx.lineTo(el.x + el.width, el.y + el.height);
      ctx.closePath();
      ctx.fill();
      if (!textHidden) drawContainerText(ctx, el, mode);
      break;
    }
    case "arrow":
    case "line": {
      generateShape(el, mode).forEach((d) => rc.draw(d));
      if (el.text && !textHidden) {
        const mid = getPathMidpoint(el);
        const fontSize = el.fontSize || 14;
        ctx.font = `${fontSize}px ${getFontStack(el.fontFamily)}`;
        const lines = el.text.split("\n");
        const lh = fontSize * LINE_HEIGHT;
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 8;
        const h = lines.length * lh + 2;
        ctx.fillStyle = opts.canvasBg;
        ctx.fillRect(mid.x - w / 2, mid.y - h / 2, w, h);
        ctx.fillStyle = ink(el.strokeColor);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        lines.forEach((line, i) => ctx.fillText(line, mid.x, mid.y - h / 2 + lh / 2 + 1 + i * lh));
      }
      break;
    }
    case "freedraw": {
      const pts = el.points ?? [];
      if (pts.length === 0) break;
      ctx.strokeStyle = ink(el.strokeColor);
      ctx.fillStyle = ink(el.strokeColor);
      ctx.lineWidth = el.strokeWidth * 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      break;
    }
    case "text": {
      if (textHidden || !el.text) break;
      const fontSize = el.fontSize || 20;
      ctx.font = `${fontSize}px ${getFontStack(el.fontFamily)}`;
      ctx.fillStyle = ink(el.strokeColor);
      ctx.textBaseline = "top";
      const align = el.textAlign || "left";
      ctx.textAlign = align;
      const tx = align === "left" ? el.x : align === "right" ? el.x + el.width : el.x + el.width / 2;
      const lh = fontSize * LINE_HEIGHT;
      el.text.split("\n").forEach((line, i) => {
        ctx.fillText(line, tx, el.y + i * lh + (lh - fontSize) / 2);
      });
      break;
    }
    case "image": {
      const img = el.imageData ? getImage(el.imageData, opts.onAssetLoad) : null;
      const r = el.roundness ? cornerRadius(el.width, el.height) : 0;
      if (img) {
        ctx.save();
        traceRoundedRect(ctx, el.x, el.y, el.width, el.height, r);
        ctx.clip();
        ctx.drawImage(img, el.x, el.y, el.width, el.height);
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(184,115,51,0.6)";
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      break;
    }
    case "frame": {
      const z = opts.zoom;
      ctx.fillStyle = mode === "cristal" ? "rgba(45,143,203,0.025)" : "rgba(255,255,255,0.015)";
      traceRoundedRect(ctx, el.x, el.y, el.width, el.height, 8);
      ctx.fill();
      ctx.strokeStyle = ink(el.strokeColor);
      ctx.lineWidth = 1.2 / z;
      ctx.stroke();
      if (!textHidden) {
        ctx.font = `${13 / z}px ${getFontStack("sans")}`;
        ctx.fillStyle = ink("#94a3b8");
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(el.name || tr("Marco"), el.x + 2 / z, el.y - 6 / z, el.width);
      }
      break;
    }
  }

  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: PlanoElement[],
  opts: SceneOptions
) {
  // Frames always sit underneath the rest of the scene
  elements.forEach((el) => el.type === "frame" && drawElement(ctx, rc, el, opts));
  elements.forEach((el) => el.type !== "frame" && drawElement(ctx, rc, el, opts));
}

export function renderElementsToCanvas(
  elements: PlanoElement[],
  options: { scale: number; background: string | null; padding?: number; mode?: AdminMode }
): HTMLCanvasElement | null {
  const bounds = getCommonBounds(elements);
  if (!bounds) return null;
  const padding = options.padding ?? 24;
  const hasFrames = elements.some((el) => el.type === "frame");
  const top = bounds.y - (hasFrames ? FRAME_LABEL_HEIGHT : 0);
  const width = bounds.width + padding * 2;
  const height = bounds.y + bounds.height - top + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * options.scale);
  canvas.height = Math.ceil(height * options.scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(options.scale, options.scale);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.translate(-bounds.x + padding, -top + padding);
  drawScene(ctx, rough.canvas(canvas), elements, {
    zoom: 1,
    canvasBg: options.background ?? "#0B0C10",
    mode: options.mode,
  });
  return canvas;
}

export function createRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  return rough.canvas(canvas);
}
