import React from "react";
import type { ElementType } from "../types";
import {
  AppStyle,
  BACKGROUND_PALETTE,
  FONT_SIZES,
  NOTE_PALETTE,
  STROKE_PALETTE,
  Swatch,
  themeColor,
} from "../theme";
import { useAdminMode } from "../../adminMode";
import { IconButton, ISLAND } from "./primitives";

import { tr } from "@/i18n/translate";
type Section =
  | "stroke"
  | "background"
  | "noteColor"
  | "fill"
  | "strokeWidth"
  | "strokeStyle"
  | "sloppiness"
  | "edges"
  | "arrowType"
  | "arrowheads"
  | "font"
  | "fontSize"
  | "align"
  | "opacity";

const SECTION_ORDER: Section[] = [
  "stroke",
  "background",
  "noteColor",
  "fill",
  "strokeWidth",
  "strokeStyle",
  "sloppiness",
  "edges",
  "arrowType",
  "arrowheads",
  "font",
  "fontSize",
  "align",
  "opacity",
];

const SECTIONS_BY_TYPE: Record<ElementType, Section[]> = {
  rectangle: ["stroke", "background", "fill", "strokeWidth", "strokeStyle", "sloppiness", "edges", "opacity"],
  diamond: ["stroke", "background", "fill", "strokeWidth", "strokeStyle", "sloppiness", "edges", "opacity"],
  ellipse: ["stroke", "background", "fill", "strokeWidth", "strokeStyle", "sloppiness", "opacity"],
  technical: [
    "stroke",
    "background",
    "fill",
    "strokeWidth",
    "strokeStyle",
    "sloppiness",
    "edges",
    "font",
    "fontSize",
    "opacity",
  ],
  arrow: ["stroke", "strokeWidth", "strokeStyle", "sloppiness", "arrowType", "arrowheads", "opacity"],
  line: ["stroke", "strokeWidth", "strokeStyle", "sloppiness", "opacity"],
  freedraw: ["stroke", "strokeWidth", "opacity"],
  text: ["stroke", "font", "fontSize", "align", "opacity"],
  note: ["stroke", "noteColor", "edges", "font", "fontSize", "align", "opacity"],
  image: ["edges", "opacity"],
  frame: ["stroke"],
};

export type LayerAction = "back" | "backward" | "forward" | "front";

interface PropertiesPanelProps {
  kinds: ElementType[];
  values: AppStyle;
  onChange: (patch: Partial<AppStyle>) => void;
  hasSelection: boolean;
  onLayer: (action: LayerAction) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const CHECKER: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,var(--tf-checker-a) 25%,transparent 25%),linear-gradient(-45deg,var(--tf-checker-a) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,var(--tf-checker-a) 75%),linear-gradient(-45deg,transparent 75%,var(--tf-checker-a) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
  backgroundColor: "var(--tf-checker-b)",
};

function swatchStyle(color: string): React.CSSProperties {
  return color === "transparent" ? CHECKER : { backgroundColor: color };
}

function ColorRow({
  palette,
  value,
  onPick,
}: {
  palette: Swatch[];
  value: string;
  onPick: (color: string) => void;
}) {
  const mode = useAdminMode();
  const isCustom = !palette.some((s) => s.val.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex items-center gap-1">
      {palette.map((s) => {
        const active = s.val.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={s.val}
            type="button"
            title={tr(s.name)}
            onClick={() => onPick(s.val)}
            style={swatchStyle(themeColor(s.val, mode))}
            className={`h-[22px] w-[22px] rounded-md border transition-transform ${
              active ? "border-(color:--tf-white) ring-2 ring-(color:--tf-22C55E-fosforo)/70" : "border-(color:--tf-black)/60 hover:scale-110"
            }`}
          />
        );
      })}
      <div className="mx-1 h-5 w-px bg-(color:--tf-B87333-cobre)/30" />
      <label
        title={tr("Color personalizado")}
        style={swatchStyle(themeColor(value, mode))}
        className={`relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border ${
          isCustom ? "border-(color:--tf-white) ring-2 ring-(color:--tf-22C55E-fosforo)/70" : "border-(color:--tf-B87333-cobre)/40"
        }`}
      >
        <input
          type="color"
          value={value === "transparent" ? "#000000" : themeColor(value, mode)}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] text-(color:--tf-94A3B8-niebla)">{tr(label)}</div>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>;
}

export function PropertiesPanel({
  kinds,
  values,
  onChange,
  hasSelection,
  onLayer,
  onDuplicate,
  onDelete,
}: PropertiesPanelProps) {
  const present = new Set(kinds.flatMap((k) => SECTIONS_BY_TYPE[k] ?? []));
  const sections = SECTION_ORDER.filter((s) => present.has(s));
  const onlyTextual = kinds.length > 0 && kinds.every((k) => k === "text" || k === "note");
  const onlyFrames = kinds.length > 0 && kinds.every((k) => k === "frame");
  const strokeLabel = onlyTextual ? "Color del texto" : onlyFrames ? "Color del marco" : "Trazo";
  const closestFont = FONT_SIZES.reduce((best, f) =>
    Math.abs(f.size - values.fontSize) < Math.abs(best.size - values.fontSize) ? f : best
  );

  const render: Record<Section, () => React.ReactNode> = {
    stroke: () => (
      <Field label={tr(strokeLabel)}>
        <ColorRow palette={STROKE_PALETTE} value={values.strokeColor} onPick={(c) => onChange({ strokeColor: c })} />
      </Field>
    ),
    background: () => (
      <Field label={tr("Fondo")}>
        <ColorRow
          palette={BACKGROUND_PALETTE}
          value={values.backgroundColor}
          onPick={(c) => onChange({ backgroundColor: c })}
        />
      </Field>
    ),
    noteColor: () => (
      <Field label={tr("Fondo de la nota")}>
        <ColorRow palette={NOTE_PALETTE} value={values.noteColor} onPick={(c) => onChange({ noteColor: c })} />
      </Field>
    ),
    fill: () =>
      values.backgroundColor === "transparent" ? null : (
        <Field label={tr("Relleno")}>
          <Row>
            <IconButton
              size="sm"
              icon="fillHachure"
              title={tr("Sombreado")}
              active={values.fillStyle === "hachure"}
              onClick={() => onChange({ fillStyle: "hachure" })}
            />
            <IconButton
              size="sm"
              icon="fillCross"
              title={tr("Sombreado cruzado")}
              active={values.fillStyle === "cross-hatch"}
              onClick={() => onChange({ fillStyle: "cross-hatch" })}
            />
            <IconButton
              size="sm"
              icon="fillSolid"
              title={tr("Sólido")}
              active={values.fillStyle === "solid"}
              onClick={() => onChange({ fillStyle: "solid" })}
            />
          </Row>
        </Field>
      ),
    strokeWidth: () => (
      <Field label={tr("Grosor del trazo")}>
        <Row>
          <IconButton size="sm" icon="strokeThin" title={tr("Fino")} active={values.strokeWidth === 1} onClick={() => onChange({ strokeWidth: 1 })} />
          <IconButton size="sm" icon="strokeBold" title={tr("Grueso")} active={values.strokeWidth === 2} onClick={() => onChange({ strokeWidth: 2 })} />
          <IconButton size="sm" icon="strokeExtra" title={tr("Extra grueso")} active={values.strokeWidth === 4} onClick={() => onChange({ strokeWidth: 4 })} />
        </Row>
      </Field>
    ),
    strokeStyle: () => (
      <Field label={tr("Estilo del trazo")}>
        <Row>
          <IconButton size="sm" icon="styleSolid" title={tr("Sólido")} active={values.strokeStyle === "solid"} onClick={() => onChange({ strokeStyle: "solid" })} />
          <IconButton size="sm" icon="styleDashed" title={tr("Discontinuo")} active={values.strokeStyle === "dashed"} onClick={() => onChange({ strokeStyle: "dashed" })} />
          <IconButton size="sm" icon="styleDotted" title={tr("Punteado")} active={values.strokeStyle === "dotted"} onClick={() => onChange({ strokeStyle: "dotted" })} />
        </Row>
      </Field>
    ),
    sloppiness: () => (
      <Field label={tr("Estilo de trazo")}>
        <Row>
          <IconButton size="sm" icon="sloppy0" title={tr("Arquitecto")} active={values.roughness === 0} onClick={() => onChange({ roughness: 0 })} />
          <IconButton size="sm" icon="sloppy1" title={tr("Artista")} active={values.roughness === 1} onClick={() => onChange({ roughness: 1 })} />
          <IconButton size="sm" icon="sloppy2" title={tr("Caricaturista")} active={values.roughness === 2} onClick={() => onChange({ roughness: 2 })} />
        </Row>
      </Field>
    ),
    edges: () => (
      <Field label={tr("Bordes")}>
        <Row>
          <IconButton size="sm" icon="edgeSharp" title={tr("Afilados")} active={!values.roundness} onClick={() => onChange({ roundness: false })} />
          <IconButton size="sm" icon="edgeRound" title={tr("Redondeados")} active={values.roundness} onClick={() => onChange({ roundness: true })} />
        </Row>
      </Field>
    ),
    arrowType: () => (
      <Field label={tr("Tipo de flecha")}>
        <Row>
          <IconButton size="sm" icon="arrowStraight" title={tr("Recta")} active={values.arrowType === "straight"} onClick={() => onChange({ arrowType: "straight" })} />
          <IconButton size="sm" icon="arrowCurved" title={tr("Curva")} active={values.arrowType === "curved"} onClick={() => onChange({ arrowType: "curved" })} />
          <IconButton size="sm" icon="arrowElbow" title={tr("Codo")} active={values.arrowType === "elbow"} onClick={() => onChange({ arrowType: "elbow" })} />
        </Row>
      </Field>
    ),
    arrowheads: () => (
      <Field label={tr("Puntas de flecha")}>
        <Row>
          <IconButton
            size="sm"
            icon="headStart"
            title={tr("Punta al inicio")}
            active={values.startArrowhead === "arrow"}
            onClick={() => onChange({ startArrowhead: values.startArrowhead === "arrow" ? "none" : "arrow" })}
          />
          <IconButton
            size="sm"
            icon="headEnd"
            title={tr("Punta al final")}
            active={values.endArrowhead === "arrow"}
            onClick={() => onChange({ endArrowhead: values.endArrowhead === "arrow" ? "none" : "arrow" })}
          />
        </Row>
      </Field>
    ),
    font: () => (
      <Field label={tr("Tipo de fuente")}>
        <Row>
          <IconButton size="sm" icon="fontHand" title={tr("Mano alzada")} active={values.fontFamily === "hand"} onClick={() => onChange({ fontFamily: "hand" })} />
          <IconButton size="sm" icon="fontSans" title={tr("Normal")} active={values.fontFamily === "sans"} onClick={() => onChange({ fontFamily: "sans" })} />
          <IconButton size="sm" icon="fontMono" title={tr("Código")} active={values.fontFamily === "mono"} onClick={() => onChange({ fontFamily: "mono" })} />
        </Row>
      </Field>
    ),
    fontSize: () => (
      <Field label={tr("Tamaño de la fuente")}>
        <Row>
          {FONT_SIZES.map((f) => (
            <IconButton
              key={f.label}
              size="sm"
              title={tr("Tamaño {size}", { size: f.label })}
              active={closestFont.label === f.label}
              onClick={() => onChange({ fontSize: f.size })}
            >
              <span className="font-sans text-[12px]">{tr(f.label)}</span>
            </IconButton>
          ))}
        </Row>
      </Field>
    ),
    align: () => (
      <Field label={tr("Alineado de texto")}>
        <Row>
          <IconButton size="sm" icon="alignLeft" title={tr("Izquierda")} active={values.textAlign === "left"} onClick={() => onChange({ textAlign: "left" })} />
          <IconButton size="sm" icon="alignCenter" title={tr("Centro")} active={values.textAlign === "center"} onClick={() => onChange({ textAlign: "center" })} />
          <IconButton size="sm" icon="alignRight" title={tr("Derecha")} active={values.textAlign === "right"} onClick={() => onChange({ textAlign: "right" })} />
        </Row>
      </Field>
    ),
    opacity: () => (
      <Field label={tr("Opacidad")}>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={values.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-(color:--tf-22C55E-fosforo)"
          aria-label={tr("Opacidad")}
        />
        <div className="flex justify-between font-mono text-[10px] text-(color:--tf-94A3B8-niebla)">
          <span>0</span>
          <span className="text-(color:--tf-E5A93C-laton)">{values.opacity}</span>
          <span>100</span>
        </div>
      </Field>
    ),
  };

  return (
    <div
      className={`${ISLAND} absolute left-3 top-[66px] z-20 max-h-[calc(100%-140px)] w-[212px] overflow-y-auto p-3 font-sans`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <React.Fragment key={s}>{render[s]()}</React.Fragment>
        ))}

        <Field label={tr("Capas")}>
          <Row>
            <IconButton size="sm" icon="layerBack" title={tr("Enviar al fondo — Ctrl+Shift+[")} disabled={!hasSelection} onClick={() => onLayer("back")} />
            <IconButton size="sm" icon="layerBackward" title={tr("Enviar atrás — Ctrl+[")} disabled={!hasSelection} onClick={() => onLayer("backward")} />
            <IconButton size="sm" icon="layerForward" title={tr("Traer adelante — Ctrl+]")} disabled={!hasSelection} onClick={() => onLayer("forward")} />
            <IconButton size="sm" icon="layerFront" title={tr("Traer al frente — Ctrl+Shift+]")} disabled={!hasSelection} onClick={() => onLayer("front")} />
          </Row>
        </Field>

        {hasSelection && (
          <Field label={tr("Acciones")}>
            <Row>
              <IconButton size="sm" icon="duplicate" title={tr("Duplicar — Ctrl+D")} onClick={onDuplicate} />
              <IconButton size="sm" icon="trash" title={tr("Eliminar — Supr")} onClick={onDelete} className="hover:!text-(color:--tf-red-400)" />
            </Row>
          </Field>
        )}
      </div>
    </div>
  );
}
