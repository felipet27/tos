export type ID = string;

export type ToolType =
  | "select"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "note"
  | "image"
  | "eraser"
  | "hand"
  | "laser"
  | "frame";

export type ElementType =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "note"
  | "image"
  | "frame"
  | "technical";

export type TechnicalCategory = "c4" | "erd" | "uml" | "bpmn" | "twoffactor";

export type FillStyle = "solid" | "hachure" | "cross-hatch" | "transparent";
export type StrokeWidth = 1 | 2 | 4;
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type Roughness = 0 | 1 | 2; // 0 = arquitecto/recto, 1 = artista/suave, 2 = boceto
export type FontFamily = "hand" | "sans" | "mono";
export type TextAlign = "left" | "center" | "right";
export type ArrowType = "straight" | "curved" | "elbow";
export type Arrowhead = "none" | "arrow";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlanoElement {
  id: ID;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
  roughness: Roughness;
  opacity: number; // 0 - 100
  roundness: boolean;
  seed?: number; // stable randomness for the hand-drawn renderer
  points?: Point[]; // for freedraw, line, arrow (scene coordinates)
  text?: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  textAlign?: TextAlign;
  arrowType?: ArrowType;
  startArrowhead?: Arrowhead;
  endArrowhead?: Arrowhead;
  imageData?: string; // data URL for image elements
  name?: string; // frame label
  technicalCategory?: TechnicalCategory;
  technicalSubtype?: string;
  customData?: Record<string, unknown>;
  locked?: boolean;
}

export interface PlanoBoardData {
  id: ID;
  name: string;
  version: number;
  updatedAt: number;
  settings: {
    grid: boolean;
    gridSize: number;
    theme: "dark" | "light";
    background: string;
  };
  elements: PlanoElement[];
}

export interface AIDiagramNode {
  id: string;
  label: string;
  type?: string;
  subType?: string;
  category?: TechnicalCategory;
  description?: string;
}

export interface AIDiagramEdge {
  from: string;
  to: string;
  label?: string;
  kind?: "straight" | "curved" | "elbow";
}

export interface AIDiagramResponse {
  kind: "c4" | "erd" | "uml" | "bpmn" | "flowchart" | "twoffactor";
  title: string;
  nodes: AIDiagramNode[];
  edges: AIDiagramEdge[];
}
