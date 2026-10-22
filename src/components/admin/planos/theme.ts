import { Caveat } from "next/font/google";
import type { AdminMode } from "../adminMode";
import type {
  ArrowType,
  Arrowhead,
  FillStyle,
  FontFamily,
  Roughness,
  StrokeStyle,
  StrokeWidth,
  TextAlign,
} from "./types";

// Hand-drawn font for the "mano alzada" text style
export const handFont = Caveat({ subsets: ["latin"], weight: ["500"], display: "swap" });

export interface Swatch {
  name: string;
  val: string;
}

// Twoffactor palette adapted to the dark blueprint canvas
export const STROKE_PALETTE: Swatch[] = [
  { name: "Plata clara", val: "#E2E4E9" },
  { name: "Rojo alerta", val: "#EF4444" },
  { name: "Verde técnico", val: "#22c55e" },
  { name: "Cian eléctrico", val: "#22D3EE" },
  { name: "Latón envejecido", val: "#E5A93C" },
];

export const BACKGROUND_PALETTE: Swatch[] = [
  { name: "Transparente", val: "transparent" },
  { name: "Rojo profundo", val: "#3B1518" },
  { name: "Verde enclave", val: "#0F2A1A" },
  { name: "Cian profundo", val: "#0A2530" },
  { name: "Latón nocturno", val: "#33240A" },
];

export const NOTE_PALETTE: Swatch[] = [
  { name: "Latón", val: "#3A2C0C" },
  { name: "Granate", val: "#3A1626" },
  { name: "Enclave", val: "#12331F" },
  { name: "Abismo", val: "#0D2B3A" },
  { name: "Cobre", val: "#3A220F" },
];

export const CANVAS_BACKGROUNDS: Swatch[] = [
  { name: "Obsidiana", val: "#0B0C10" },
  { name: "Noche profunda", val: "#07080E" },
  { name: "Grafito", val: "#0D1117" },
  { name: "Azul plano", val: "#0B1424" },
  { name: "Cobre oscuro", val: "#14100B" },
];

export const DEFAULT_CANVAS_BG = CANVAS_BACKGROUNDS[0].val;

// Light counterparts used by the Cristal mode, index-aligned with CANVAS_BACKGROUNDS
const CANVAS_BACKGROUNDS_CRISTAL = ["#F4F7FA", "#FFFFFF", "#EEF2F6", "#E8F1FA", "#F8EFE9"];

// Drawings keep their Forja colors; Cristal paints them with these light-world equivalents
const CRISTAL_COLORS: Record<string, string> = {
  // Strokes & text
  "#e2e4e9": "#26313d",
  "#ef4444": "#d64545",
  "#22c55e": "#1f9d55",
  "#22d3ee": "#1690c4",
  "#e5a93c": "#b97a69",
  "#b87333": "#0f3a5f",
  "#c0c0c0": "#5a6573",
  "#ffffff": "#26313d",
  "#f5f5f5": "#26313d",
  "#94a3b8": "#6b7785",
  // Shape fills
  "#3b1518": "#fbe3e3",
  "#0f2a1a": "#ddf3e6",
  "#0a2530": "#dcedf8",
  "#33240a": "#f6e6dc",
  // Notes
  "#3a2c0c": "#fdf0cf",
  "#3a1626": "#f9e1ea",
  "#12331f": "#e0f3e7",
  "#0d2b3a": "#def0fa",
  "#3a220f": "#f7e4d6",
  // Technical package fills
  "#07131d": "#e3f0fa",
  "#07202b": "#e3f0fa",
  "#081520": "#e3f0fa",
  "#09141f": "#e3f0fa",
  "#081e11": "#e2f4ea",
  "#091d13": "#e2f4ea",
  "#0a1810": "#e2f4ea",
  "#0b1a12": "#e2f4ea",
  "#121422": "#eef2f7",
  "#14100b": "#f8efe9",
  "#181008": "#f8ece4",
  "#19140c": "#f8ece4",
  "#1a1507": "#f8ece4",
  "#1d1107": "#f8ece4",
  "#1e1609": "#f8ece4",
  "#1f150a": "#f8ece4",
  "#220808": "#fde8e8",
};

export function themeColor(color: string, mode: AdminMode): string {
  if (mode !== "cristal" || color === "transparent") return color;
  const index = CANVAS_BACKGROUNDS.findIndex((c) => c.val.toLowerCase() === color.toLowerCase());
  if (index >= 0) return CANVAS_BACKGROUNDS_CRISTAL[index];
  return CRISTAL_COLORS[color.toLowerCase()] ?? color;
}

// Canvas chrome (grid, selection) for each world
export const CANVAS_CHROME: Record<
  AdminMode,
  { gridLine: string; gridDot: string; selection: string; marqueeFill: string; marqueeStroke: string; noteShadow: string }
> = {
  forja: {
    gridLine: "rgba(184, 115, 51, 0.09)",
    gridDot: "rgba(229, 169, 60, 0.28)",
    selection: "#22D3EE",
    marqueeFill: "rgba(34, 211, 238, 0.06)",
    marqueeStroke: "rgba(34, 211, 238, 0.7)",
    noteShadow: "rgba(0,0,0,0.45)",
  },
  cristal: {
    gridLine: "rgba(45, 143, 203, 0.1)",
    gridDot: "rgba(15, 58, 95, 0.25)",
    selection: "#2D8FCB",
    marqueeFill: "rgba(45, 143, 203, 0.08)",
    marqueeStroke: "rgba(45, 143, 203, 0.8)",
    noteShadow: "rgba(15,58,95,0.18)",
  },
};

export const FONT_SIZES: { label: string; size: number }[] = [
  { label: "S", size: 16 },
  { label: "M", size: 20 },
  { label: "L", size: 28 },
  { label: "XL", size: 36 },
];

// Style applied to newly created elements (and edited from the properties panel)
export interface AppStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
  roughness: Roughness;
  opacity: number;
  roundness: boolean;
  fontFamily: FontFamily;
  fontSize: number;
  textAlign: TextAlign;
  arrowType: ArrowType;
  startArrowhead: Arrowhead;
  endArrowhead: Arrowhead;
  noteColor: string;
}

export const DEFAULT_STYLE: AppStyle = {
  strokeColor: STROKE_PALETTE[0].val,
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  roundness: true,
  fontFamily: "hand",
  fontSize: 20,
  textAlign: "left",
  arrowType: "curved",
  startArrowhead: "none",
  endArrowhead: "arrow",
  noteColor: NOTE_PALETTE[0].val,
};

let resolvedSans = "";
let resolvedMono = "";

function readCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Canvas cannot resolve CSS variables, so the font stacks are resolved once at runtime
export function getFontStack(family: FontFamily | undefined): string {
  if (family === "hand") return `${handFont.style.fontFamily}, "Segoe Print", cursive`;
  if (family === "mono") {
    if (!resolvedMono) resolvedMono = readCssVar("--font-geist-mono") || "ui-monospace";
    return `${resolvedMono}, ui-monospace, monospace`;
  }
  if (!resolvedSans) resolvedSans = readCssVar("--font-geist-sans") || "system-ui";
  return `${resolvedSans}, system-ui, sans-serif`;
}

export const LINE_HEIGHT = 1.25;
