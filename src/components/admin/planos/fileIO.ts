import type { FontFamily, PlanoBoardData, PlanoElement, Point, StrokeStyle } from "./types";
import { newElementId, syncPointBounds } from "./geometry";

type Raw = Record<string, unknown>;

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);

// Excalidraw's default dark ink would be invisible on the dark blueprint canvas
function lighten(color: string): string {
  const c = color.toLowerCase();
  return c === "#1e1e1e" || c === "#000000" || c === "#000" ? "#E2E4E9" : color;
}

const EXCALIDRAW_FONTS: Record<number, FontFamily> = { 1: "hand", 2: "sans", 3: "mono", 5: "hand", 6: "sans", 8: "mono" };

function fromExcalidraw(rawElements: Raw[]): PlanoElement[] {
  const out: PlanoElement[] = [];
  rawElements.forEach((e) => {
    if (e.isDeleted) return;
    const type = str(e.type);
    const strokeWidth = num(e.strokeWidth, 2);
    const fill = str(e.fillStyle, "solid");
    const base: PlanoElement = {
      id: str(e.id) || newElementId(),
      type: "rectangle",
      x: num(e.x),
      y: num(e.y),
      width: num(e.width),
      height: num(e.height),
      angle: 0,
      strokeColor: lighten(str(e.strokeColor, "#E2E4E9")),
      backgroundColor: str(e.backgroundColor, "transparent"),
      fillStyle: fill === "hachure" || fill === "cross-hatch" ? fill : "solid",
      strokeWidth: strokeWidth >= 4 ? 4 : strokeWidth >= 2 ? 2 : 1,
      strokeStyle: (["solid", "dashed", "dotted"].includes(str(e.strokeStyle)) ? str(e.strokeStyle) : "solid") as StrokeStyle,
      roughness: Math.min(2, Math.max(0, Math.round(num(e.roughness, 1)))) as 0 | 1 | 2,
      opacity: num(e.opacity, 100),
      roundness: Boolean(e.roundness),
      seed: num(e.seed) || undefined,
    };

    if (type === "rectangle" || type === "diamond" || type === "ellipse") {
      out.push({ ...base, type });
    } else if (type === "text") {
      out.push({
        ...base,
        type: "text",
        text: str(e.text),
        fontSize: num(e.fontSize, 20),
        fontFamily: EXCALIDRAW_FONTS[num(e.fontFamily, 1)] ?? "hand",
        textAlign: (["left", "center", "right"].includes(str(e.textAlign)) ? str(e.textAlign) : "left") as
          | "left"
          | "center"
          | "right",
      });
    } else if (type === "arrow" || type === "line" || type === "freedraw") {
      const rawPoints = Array.isArray(e.points) ? (e.points as unknown[]) : [];
      const points: Point[] = rawPoints
        .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
        .map(([px, py]) => ({ x: base.x + px, y: base.y + py }));
      if (points.length === 0) return;
      const linear = type !== "freedraw";
      out.push(
        syncPointBounds({
          ...base,
          type,
          backgroundColor: "transparent",
          // Multi-point lines keep their shape only as a straight polyline
          points: linear && type === "arrow" && points.length > 2 ? [points[0], points[points.length - 1]] : points,
          arrowType: e.elbowed ? "elbow" : "straight",
          startArrowhead: e.startArrowhead ? "arrow" : "none",
          endArrowhead: e.endArrowhead ? "arrow" : "none",
        })
      );
    } else if (type === "frame" || type === "magicframe") {
      out.push({ ...base, type: "frame", name: str(e.name, "Marco"), strokeColor: "#B87333", backgroundColor: "transparent" });
    }
  });
  return out;
}

export function parseBoardFile(content: string): { elements: PlanoElement[]; background?: string } | null {
  try {
    const parsed = JSON.parse(content) as Raw;
    if (!Array.isArray(parsed.elements)) return null;
    if (parsed.type === "excalidraw") {
      return { elements: fromExcalidraw(parsed.elements as Raw[]) };
    }
    const settings = (parsed.settings ?? {}) as Raw;
    return {
      elements: (parsed.elements as PlanoElement[]).map((el) => (el.type === "freedraw" ? syncPointBounds(el) : el)),
      background: typeof settings.background === "string" ? settings.background : undefined,
    };
  } catch {
    return null;
  }
}

export function serializeBoard(elements: PlanoElement[], settings: { grid: boolean; background: string }): string {
  const data: PlanoBoardData = {
    id: "plano-bicefalo-main",
    name: "Plano Criptográfico Twoffactor",
    version: 2,
    updatedAt: Date.now(),
    settings: { grid: settings.grid, gridSize: 20, theme: "dark", background: settings.background },
    elements,
  };
  return JSON.stringify(data);
}

export function downloadBoard(elements: PlanoElement[], settings: { grid: boolean; background: string }) {
  const blob = new Blob([serializeBoard(elements, settings)], { type: "application/vnd.planos+json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `twoffactor-plano-${new Date().toISOString().slice(0, 10)}.plano`;
  link.click();
  URL.revokeObjectURL(url);
}

const MAX_IMAGE_SIDE = 1600;

// Reads an image file, downscaling big pictures so the board still fits in localStorage
export function readImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen no válida"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale === 1 && file.size < 400_000) {
          resolve({ dataUrl: src, width: img.naturalWidth, height: img.naturalHeight });
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/webp", 0.85), width: canvas.width, height: canvas.height });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
