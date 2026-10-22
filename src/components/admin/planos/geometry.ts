import type { Bounds, PlanoElement, Point } from "./types";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "start" | "end";

export const isLinear = (el: PlanoElement) => el.type === "arrow" || el.type === "line";
export const hasPoints = (el: PlanoElement) => isLinear(el) || el.type === "freedraw";

export function newElementId(prefix = "el"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function boundsFromPoints(points: Point[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

// Control point of the gentle bend used by "curved" arrows
export function getCurveControl(a: Point, b: Point): Point {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (!len) return { x: mx, y: my };
  const offset = Math.min(len * 0.2, 80);
  return { x: mx - (dy / len) * offset, y: my + (dx / len) * offset };
}

// Polyline actually drawn for a line/arrow, depending on its arrow type
export function getLinearPath(el: PlanoElement): Point[] {
  const pts = el.points ?? [];
  if (pts.length < 2) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];

  if (el.type === "arrow" && el.arrowType === "elbow") {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const mx = a.x + dx / 2;
      return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
    }
    const my = a.y + dy / 2;
    return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
  }

  if (el.type === "arrow" && el.arrowType === "curved") {
    const c = getCurveControl(a, b);
    const steps = 24;
    const out: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      out.push({
        x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
        y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
      });
    }
    return out;
  }

  return pts;
}

export function getBounds(el: PlanoElement): Bounds {
  if (hasPoints(el) && el.points && el.points.length > 0) {
    return boundsFromPoints(isLinear(el) ? getLinearPath(el) : el.points);
  }
  return {
    x: Math.min(el.x, el.x + el.width),
    y: Math.min(el.y, el.y + el.height),
    width: Math.abs(el.width),
    height: Math.abs(el.height),
  };
}

export function getCommonBounds(elements: PlanoElement[]): Bounds | null {
  if (elements.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  elements.forEach((el) => {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Keeps x/y/width/height in sync with the points of point-based elements
export function syncPointBounds(el: PlanoElement): PlanoElement {
  if (!hasPoints(el) || !el.points || el.points.length === 0) return el;
  const b = boundsFromPoints(el.points);
  return { ...el, x: b.x, y: b.y, width: b.width, height: b.height };
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distToPolyline(p: Point, pts: Point[]): number {
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) {
    min = Math.min(min, distToSegment(p, pts[i - 1], pts[i]));
  }
  return min;
}

export function getPathMidpoint(el: PlanoElement): Point {
  const path = getLinearPath(el);
  if (path.length === 0) return { x: el.x, y: el.y };
  if (path.length === 2) {
    return { x: (path[0].x + path[1].x) / 2, y: (path[0].y + path[1].y) / 2 };
  }
  if (el.arrowType === "elbow" && path.length === 4) {
    return { x: (path[1].x + path[2].x) / 2, y: (path[1].y + path[2].y) / 2 };
  }
  return path[Math.floor(path.length / 2)];
}

export const FRAME_LABEL_HEIGHT = 22;

export function hitTest(el: PlanoElement, p: Point, tolerance: number): boolean {
  const b = getBounds(el);

  if (hasPoints(el)) {
    const path = isLinear(el) ? getLinearPath(el) : el.points ?? [];
    if (path.length === 0) return false;
    if (distToPolyline(p, path) <= tolerance + el.strokeWidth) return true;
    // Arrow labels are clickable too
    if (el.text && isLinear(el)) {
      const mid = getPathMidpoint(el);
      return Math.abs(p.x - mid.x) < 50 && Math.abs(p.y - mid.y) < 14;
    }
    return false;
  }

  if (el.type === "ellipse") {
    const rx = b.width / 2 + tolerance;
    const ry = b.height / 2 + tolerance;
    const dx = p.x - (b.x + b.width / 2);
    const dy = p.y - (b.y + b.height / 2);
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  if (el.type === "diamond") {
    const hw = b.width / 2 + tolerance;
    const hh = b.height / 2 + tolerance;
    const dx = Math.abs(p.x - (b.x + b.width / 2));
    const dy = Math.abs(p.y - (b.y + b.height / 2));
    return dx / hw + dy / hh <= 1;
  }

  if (el.type === "frame") {
    // Frames are grabbed by their border or their title, so the inside stays clickable
    const onLabel =
      p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y - FRAME_LABEL_HEIGHT && p.y <= b.y;
    const inOuter =
      p.x >= b.x - tolerance &&
      p.x <= b.x + b.width + tolerance &&
      p.y >= b.y - tolerance &&
      p.y <= b.y + b.height + tolerance;
    const inInner =
      p.x > b.x + tolerance &&
      p.x < b.x + b.width - tolerance &&
      p.y > b.y + tolerance &&
      p.y < b.y + b.height - tolerance;
    return onLabel || (inOuter && !inInner);
  }

  return (
    p.x >= b.x - tolerance &&
    p.x <= b.x + b.width + tolerance &&
    p.y >= b.y - tolerance &&
    p.y <= b.y + b.height + tolerance
  );
}

export function findElementAt(
  elements: PlanoElement[],
  p: Point,
  zoom: number
): PlanoElement | undefined {
  const tolerance = 6 / zoom;
  return [...elements].reverse().find((el) => hitTest(el, p, tolerance));
}

export const SELECTION_PADDING = 6;

export function getHandles(el: PlanoElement, zoom: number): { id: HandleId; x: number; y: number }[] {
  if (isLinear(el) && el.points && el.points.length >= 2) {
    const first = el.points[0];
    const last = el.points[el.points.length - 1];
    return [
      { id: "start", x: first.x, y: first.y },
      { id: "end", x: last.x, y: last.y },
    ];
  }
  const pad = SELECTION_PADDING / zoom;
  const b = getBounds(el);
  const x1 = b.x - pad;
  const y1 = b.y - pad;
  const x2 = b.x + b.width + pad;
  const y2 = b.y + b.height + pad;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return [
    { id: "nw", x: x1, y: y1 },
    { id: "n", x: mx, y: y1 },
    { id: "ne", x: x2, y: y1 },
    { id: "e", x: x2, y: my },
    { id: "se", x: x2, y: y2 },
    { id: "s", x: mx, y: y2 },
    { id: "sw", x: x1, y: y2 },
    { id: "w", x: x1, y: my },
  ];
}

export function hitHandle(el: PlanoElement, p: Point, zoom: number): HandleId | null {
  const radius = 8 / zoom;
  const handle = getHandles(el, zoom).find(
    (h) => Math.abs(p.x - h.x) <= radius && Math.abs(p.y - h.y) <= radius
  );
  return handle ? handle.id : null;
}

export const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  start: "move",
  end: "move",
};

export function translateElement(el: PlanoElement, dx: number, dy: number): PlanoElement {
  return {
    ...el,
    x: el.x + dx,
    y: el.y + dy,
    points: el.points?.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
  };
}

export function resizeElement(
  orig: PlanoElement,
  handle: HandleId,
  p: Point,
  keepRatio: boolean
): PlanoElement {
  if (handle === "start" || handle === "end") {
    const points = [...(orig.points ?? [])];
    if (handle === "start") points[0] = p;
    else points[points.length - 1] = p;
    return syncPointBounds({ ...orig, points });
  }

  const b = getBounds(orig);
  let x1 = b.x;
  let y1 = b.y;
  let x2 = b.x + b.width;
  let y2 = b.y + b.height;
  if (handle.includes("w")) x1 = p.x;
  if (handle.includes("e")) x2 = p.x;
  if (handle.includes("n")) y1 = p.y;
  if (handle.includes("s")) y2 = p.y;

  const isCorner = handle.length === 2;
  if ((keepRatio || orig.type === "text" || orig.type === "image") && isCorner && b.height > 0) {
    const ratio = b.width / b.height || 1;
    let w = x2 - x1;
    let h = y2 - y1;
    if (Math.abs(w) / ratio > Math.abs(h)) h = (Math.sign(h) || 1) * (Math.abs(w) / ratio);
    else w = (Math.sign(w) || 1) * Math.abs(h) * ratio;
    if (handle.includes("w")) x1 = x2 - w;
    else x2 = x1 + w;
    if (handle.includes("n")) y1 = y2 - h;
    else y2 = y1 + h;
  }

  const nx = Math.min(x1, x2);
  const ny = Math.min(y1, y2);
  const nw = Math.max(Math.abs(x2 - x1), 2);
  const nh = Math.max(Math.abs(y2 - y1), 2);

  if (orig.type === "freedraw" && orig.points) {
    const sx = b.width ? nw / b.width : 1;
    const sy = b.height ? nh / b.height : 1;
    const points = orig.points.map((pt) => ({ x: nx + (pt.x - b.x) * sx, y: ny + (pt.y - b.y) * sy }));
    return { ...orig, points, x: nx, y: ny, width: nw, height: nh };
  }

  if (orig.type === "text" && b.height > 0) {
    const fontSize = Math.max(6, Math.round((orig.fontSize ?? 20) * (nh / b.height) * 10) / 10);
    return { ...orig, x: nx, y: ny, width: nw, height: nh, fontSize };
  }

  return { ...orig, x: nx, y: ny, width: nw, height: nh };
}
