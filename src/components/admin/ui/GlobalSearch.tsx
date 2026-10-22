"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/i18n/translate";
import { useClients, getStage } from "../data/clients";
import { useIdeas } from "../data/ideas";
import { useAdrs, useTasks } from "../data/tasks";
import { ModuleKey, navigate } from "../nav";
import { Modal } from "./Modal";
import { Badge, cx, inputClass, matchesQuery } from "./kit";

interface Result {
  key: string;
  group: string;
  title: string;
  subtitle: string;
  badge: string;
  module: ModuleKey;
  sub?: string;
}

const MAX_PER_GROUP = 6;

// Search across clients, ideas, tasks and ADRs; opened from the magnifier next to the
// path prompt, with Ctrl+K or with "/"
export function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tr("Buscar en TOS")}
        title={tr("Buscar en TOS (Ctrl+K)")}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-(color:--tf-22C55E-fosforo)/40 bg-(color:--tf-22C55E-fosforo)/10 px-2 text-[11px] font-bold text-(color:--tf-22C55E-fosforo) transition-colors hover:bg-(color:--tf-22C55E-fosforo)/20 pointer-coarse:h-10 pointer-coarse:px-3"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="hidden lg:inline">{tr("Buscar")}</span>
        <kbd className="hidden rounded border border-current/40 px-1 text-[9px] font-mono opacity-70 lg:inline">Ctrl K</kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const clients = useClients();
  const ideas = useIdeas();
  const tasks = useTasks();
  const adrs = useAdrs();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const clientResults = clients
      .filter((c) => matchesQuery(q, c.name, c.id, c.industry, c.contactName, c.contactEmail))
      .slice(0, MAX_PER_GROUP)
      .map<Result>((c) => ({
        key: `c-${c.id}`,
        group: tr("Clientes"),
        title: c.name,
        subtitle: `${c.id} • ${tr(c.industry)}${c.archived ? ` • ${tr("Archivado")}` : ""}`,
        badge: getStage(c.currentStage).sigla,
        module: "boveda",
        sub: c.id,
      }));
    const ideaResults = ideas
      .filter((i) => matchesQuery(q, i.id, i.title, i.description, i.tags.join(" ")))
      .slice(0, MAX_PER_GROUP)
      .map<Result>((i) => ({
        key: `i-${i.id}`,
        group: tr("Ideas"),
        title: tr(i.title),
        subtitle: `${i.id}${i.archived ? ` • ${tr("Archivada")}` : ""}`,
        badge: "💡",
        module: "cultivo",
        sub: i.id,
      }));
    const taskResults = tasks
      .filter((t) => matchesQuery(q, t.id, t.title, t.description, t.branch, t.repo))
      .slice(0, MAX_PER_GROUP)
      .map<Result>((t) => ({
        key: `t-${t.id}`,
        group: tr("Tareas"),
        title: tr(t.title),
        subtitle: `${t.id} • ${tr(t.status)} • ${t.assignee}`,
        badge: t.priority,
        module: "taller",
        sub: t.id,
      }));
    const adrResults = adrs
      .filter((a) => matchesQuery(q, a.id, a.title, a.decision))
      .slice(0, MAX_PER_GROUP)
      .map<Result>((a) => ({
        key: `a-${a.id}`,
        group: tr("Decisiones de arquitectura"),
        title: tr(a.title),
        subtitle: `${a.id} • ${tr(a.status)}`,
        badge: "ADR",
        module: "taller",
        sub: "arquitectura",
      }));
    return [...clientResults, ...ideaResults, ...taskResults, ...adrResults];
  }, [query, clients, ideas, tasks, adrs]);

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function open(result: Result) {
    navigate(result.module, result.sub);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      open(results[activeIndex]);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let lastGroup = "";

  return (
    <Modal open onClose={onClose} title={tr("Buscar en TOS")} subtitle={tr("Clientes, ideas, tareas y decisiones de arquitectura")} icon="🔍" tone="fosforo" size="lg">
      <input
        data-autofocus
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder={tr("Escribe un nombre, ID (FF-003, DEV-104, IDEA-TFF-02) o palabra clave...")}
        aria-label={tr("Buscar en TOS")}
        className={inputClass}
      />

      <div ref={listRef} role="listbox" aria-label={tr("Resultados")} className="mt-3 space-y-1">
        {!query.trim() && (
          <p className="py-6 text-center text-(color:--tf-94A3B8-niebla)">
            {tr("Escribe para buscar. Usa ↑ ↓ para moverte y Enter para abrir.")}
          </p>
        )}
        {query.trim() && results.length === 0 && (
          <p className="py-6 text-center text-(color:--tf-94A3B8-niebla)">{tr("Sin resultados para \"{query}\".", { query })}</p>
        )}
        {results.map((r, index) => {
          const header = r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          return (
            <div key={r.key}>
              {header && (
                <div className="px-1 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{header}</div>
              )}
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => open(r)}
                className={cx(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors pointer-coarse:min-h-12",
                  index === activeIndex
                    ? "border-(color:--tf-22C55E-fosforo)/60 bg-(color:--tf-22C55E-fosforo)/10"
                    : "border-transparent hover:bg-(color:--tf-141829)"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-(color:--tf-white)">{r.title}</span>
                  <span className="block truncate text-[11px] text-(color:--tf-94A3B8-niebla)">{r.subtitle}</span>
                </span>
                <Badge tone="laton">{r.badge}</Badge>
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
