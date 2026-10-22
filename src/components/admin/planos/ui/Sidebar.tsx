import React, { useState } from "react";
import type { PlanoElement, TechnicalCategory } from "../types";
import { TECHNICAL_STENCILS, StencilItem } from "../technicalPackages";
import { Icon } from "./icons";
import { IconButton, ISLAND } from "./primitives";

import { tr } from "@/i18n/translate";
export type SidebarTab = "search" | "library";

export interface LibraryItem {
  id: string;
  name: string;
  elements: PlanoElement[];
  thumbnail: string;
}

const CATEGORIES: { id: TechnicalCategory; name: string }[] = [
  { id: "c4", name: "C4" },
  { id: "twoffactor", name: "Twoffactor 2FA" },
  { id: "erd", name: "ERD" },
  { id: "bpmn", name: "BPMN" },
  { id: "uml", name: "UML" },
];

const TYPE_LABELS: Record<PlanoElement["type"], string> = {
  rectangle: "Rectángulo",
  diamond: "Rombo",
  ellipse: "Elipse",
  arrow: "Flecha",
  line: "Línea",
  freedraw: "Trazo",
  text: "Texto",
  note: "Nota",
  image: "Imagen",
  frame: "Marco",
  technical: "Paquete técnico",
};

interface SidebarProps {
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  elements: PlanoElement[];
  onFocusElement: (id: string) => void;
  hasSelection: boolean;
  libraryItems: LibraryItem[];
  onAddSelection: () => void;
  onInsertLibraryItem: (item: LibraryItem) => void;
  onRemoveLibraryItem: (id: string) => void;
  onInsertStencil: (stencil: StencilItem) => void;
}

function searchableText(el: PlanoElement): string {
  return el.type === "frame" ? el.name || tr("Marco") : el.text || "";
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0 || !query) return <>{tr(text)}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-(color:--tf-E5A93C-laton)/30 px-0.5 text-(color:--tf-E5A93C-laton)">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchTab({ elements, onFocusElement }: Pick<SidebarProps, "elements" | "onFocusElement">) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? elements.filter((el) => searchableText(el).toLowerCase().includes(q))
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/40 px-2.5 py-1.5 focus-within:border-(color:--tf-22C55E-fosforo)">
        <Icon name="search" size={15} className="text-(color:--tf-94A3B8-niebla)" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("Encontrar en lienzo...")}
          className="w-full bg-transparent text-[13px] text-(color:--tf-white) outline-none placeholder:text-(color:--tf-5B6170)"
        />
      </div>
      <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">
        {q ? tr(results.length === 1 ? "{count} coincidencia" : "{count} coincidencias", { count: results.length }) : tr("Busca textos, notas y nombres de marcos.")}
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {results.map((el) => {
          const text = searchableText(el).replace(/\n/g, " ");
          return (
            <button
              key={el.id}
              type="button"
              onClick={() => onFocusElement(el.id)}
              className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-(color:--tf-B87333-cobre)/40 hover:bg-(color:--tf-white)/5"
            >
              <div className="text-[10px] font-bold uppercase tracking-wide text-(color:--tf-B87333-cobre)">{tr(TYPE_LABELS[el.type])}</div>
              <div className="line-clamp-2 text-[12px] text-(color:--tf-C0C0C0-plata)">
                <Highlight text={text} query={query.trim()} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LibraryTab({
  hasSelection,
  libraryItems,
  onAddSelection,
  onInsertLibraryItem,
  onRemoveLibraryItem,
  onInsertStencil,
}: Omit<SidebarProps, "tab" | "onTabChange" | "onClose" | "elements" | "onFocusElement">) {
  const [category, setCategory] = useState<TechnicalCategory>("c4");

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("Mi biblioteca")}</h4>
          <button
            type="button"
            disabled={!hasSelection}
            onClick={onAddSelection}
            className="rounded-md border border-(color:--tf-22C55E-fosforo)/50 px-2 py-0.5 text-[11px] font-semibold text-(color:--tf-22C55E-fosforo) hover:bg-(color:--tf-22C55E-fosforo)/15 disabled:pointer-events-none disabled:opacity-35"
          >
            {tr("+ Añadir selección")}
          </button>
        </div>
        {libraryItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-(color:--tf-B87333-cobre)/35 px-4 py-6 text-center">
            <div className="text-[13px] font-bold text-(color:--tf-22C55E-fosforo)">{tr("No hay elementos añadidos todavía...")}</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-(color:--tf-94A3B8-niebla)">
              {tr("Selecciona elementos en el lienzo y pulsa «Añadir selección» para reutilizarlos en cualquier plano.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {libraryItems.map((item) => (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  title={tr("Insertar {name}", { name: item.name })}
                  onClick={() => onInsertLibraryItem(item)}
                  className="flex aspect-square w-full items-center justify-center rounded-lg border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 p-1.5 transition-colors hover:border-(color:--tf-22C55E-fosforo)"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt={tr(item.name)} className="max-h-full max-w-full object-contain" />
                </button>
                <button
                  type="button"
                  title={tr("Quitar de la biblioteca")}
                  onClick={() => onRemoveLibraryItem(item.id)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-(color:--tf-red-500)/60 bg-(color:--tf-07080E) text-(color:--tf-red-400) group-hover:flex pointer-coarse:flex"
                >
                  <Icon name="close" size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("Paquetes técnicos")}</h4>
        <div className="mb-3 flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                category === c.id
                  ? "border-(color:--tf-22C55E-fosforo)/60 bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo)"
                  : "border-(color:--tf-B87333-cobre)/30 text-(color:--tf-94A3B8-niebla) hover:text-(color:--tf-white)"
              }`}
            >
              {tr(c.name)}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {TECHNICAL_STENCILS.filter((s) => s.category === category).map((stencil) => (
            <button
              key={stencil.id}
              type="button"
              onClick={() => onInsertStencil(stencil)}
              className="group w-full rounded-lg border border-(color:--tf-B87333-cobre)/25 bg-(color:--tf-black)/30 p-2.5 text-left transition-colors hover:border-(color:--tf-22C55E-fosforo)/60 hover:bg-(color:--tf-22C55E-fosforo)/5"
            >
              <div className="flex items-center justify-between text-[12px] font-bold text-(color:--tf-white) group-hover:text-(color:--tf-22C55E-fosforo)">
                <span className="flex items-center gap-2">
                  <span className="text-base">{stencil.icon}</span>
                  {tr(stencil.name)}
                </span>
                <span className="text-[10px] text-(color:--tf-E5A93C-laton) opacity-0 transition-opacity group-hover:opacity-100">
                  {tr("+ Insertar")}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-(color:--tf-94A3B8-niebla)">{tr(stencil.description)}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      className={`${ISLAND} absolute bottom-3 right-3 top-3 z-40 flex w-[320px] max-w-[calc(100%-24px)] flex-col p-3 font-sans text-(color:--tf-C0C0C0-plata)`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-(color:--tf-B87333-cobre)/30 p-0.5">
          <IconButton
            size="sm"
            icon="search"
            title={tr("Encontrar en lienzo — Ctrl+F")}
            active={props.tab === "search"}
            onClick={() => props.onTabChange("search")}
          />
          <IconButton
            size="sm"
            icon="library"
            title={tr("Biblioteca")}
            active={props.tab === "library"}
            onClick={() => props.onTabChange("library")}
          />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-(color:--tf-white)">
          {props.tab === "search" ? tr("Buscar") : tr("Biblioteca")}
        </span>
        <IconButton size="sm" icon="close" title={tr("Cerrar")} onClick={props.onClose} />
      </div>

      {props.tab === "search" ? <SearchTab {...props} /> : <LibraryTab {...props} />}
    </aside>
  );
}
