"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { tr, trv } from "@/i18n/translate";
import { PlanosBoard } from "./planos/PlanosBoard";
import {
  IDEA_IMPACTS,
  IDEA_LEADS,
  IDEA_STAGES,
  IDEA_STAGE_LABELS,
  IdeaImpact,
  IdeaItem,
  IdeaLead,
  IdeaStage,
  ideasStore,
  moveIdea,
  nextIdeaId,
  parseTags,
  useIdeas,
} from "./data/ideas";
import { auditLog } from "./data/tasks";
import { todayStamp } from "./data/time";
import { navigate } from "./nav";
import { useSession } from "./session";
import { useFeedback } from "./ui/feedback";
import { Modal } from "./ui/Modal";
import { Badge, Button, Chip, EmptyState, Field, IconButton, ModuleHeader, cx, inputClass, matchesQuery, panelClass, subPanelClass } from "./ui/kit";

const STAGE_STYLE: Record<IdeaStage, { text: string; dot: string }> = {
  semilla: { text: "text-(color:--tf-E5A93C-laton)", dot: "bg-(color:--tf-E5A93C-laton)" },
  crecimiento: { text: "text-(color:--tf-22D3EE-cian)", dot: "bg-(color:--tf-22D3EE-cian)" },
  cosecha: { text: "text-(color:--tf-22C55E-fosforo)", dot: "bg-(color:--tf-22C55E-fosforo)" },
};

const LEAD_LABELS: Record<IdeaLead, string> = {
  Felipe: "Felipe (Producto)",
  "Juan Pablo": "Juan Pablo (Seguridad)",
  Ambos: "Ambos (Co-desarrollo)",
};

export function CultivoModule({ sub }: { sub?: string }) {
  const tab = sub === "planos" ? "planos" : "ideas";
  const focusId = sub && sub !== "planos" ? sub.toUpperCase() : undefined;
  const ideas = useIdeas();

  return (
    <div className="flex flex-col gap-3">
      <ModuleHeader
        accent="cian"
        title={tr("CULTIVO // INCUBADORA DE IDEAS & PLANOS")}
        subtitle={tr("Las ideas maduran por etapas; al llegar a Cosecha se convierten en una tarea de Taller.")}
        actions={
          <div className="flex gap-1 rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-121422) p-1">
            <Chip active={tab === "ideas"} tone="laton" onClick={() => navigate("cultivo")}>
              💡 {tr("Ideas ({n})", { n: ideas.filter((i) => !i.archived).length })}
            </Chip>
            <Chip active={tab === "planos"} tone="cian" onClick={() => navigate("cultivo", "planos")}>
              📐 {tr("Planos")}
            </Chip>
          </div>
        }
      />

      {tab === "planos" ? (
        <div className="relative flex h-[calc(100dvh-210px)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-(color:--tf-B87333-cobre)/30 sm:h-[640px]">
          <PlanosBoard />
        </div>
      ) : (
        <IdeasBoard key={focusId ?? "all"} ideas={ideas} focusId={focusId} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ board

function IdeasBoard({ ideas, focusId }: { ideas: IdeaItem[]; focusId?: string }) {
  const { me } = useSession();
  const { toast } = useFeedback();
  const focused = focusId ? ideas.find((i) => i.id === focusId) : undefined;

  const [query, setQuery] = useState("");
  const [impact, setImpact] = useState<"" | IdeaImpact>("");
  const [lead, setLead] = useState<"" | IdeaLead>("");
  const [tag, setTag] = useState("");
  const [showArchived, setShowArchived] = useState(focused?.archived ?? false);
  const [mobileStage, setMobileStage] = useState<IdeaStage>(focused?.stage ?? "semilla");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<IdeaItem | null>(null);
  const [history, setHistory] = useState<IdeaItem | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<IdeaStage | null>(null);

  const allTags = useMemo(() => Array.from(new Set(ideas.flatMap((i) => i.tags))).sort((a, b) => a.localeCompare(b)), [ideas]);
  const archivedCount = ideas.filter((i) => i.archived).length;
  const filtersActive = !!(query || impact || lead || tag);

  const visible = ideas.filter(
    (i) =>
      i.archived === showArchived &&
      (!impact || i.impact === impact) &&
      (!lead || i.lead === lead) &&
      (!tag || i.tags.includes(tag)) &&
      matchesQuery(query, i.id, i.title, i.description, i.tags.join(" "))
  );

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`idea-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);

  function move(idea: IdeaItem, target: IdeaStage, how: string) {
    const result = moveIdea(idea.id, target, me, how);
    if (result.created && result.taskId) {
      toast(tr("{idea} pasó a Cosecha y se creó la tarea {task} en el backlog de Taller", { idea: idea.id, task: result.taskId }));
    } else {
      toast(tr("{idea} movida a {stage}", { idea: idea.id, stage: tr(IDEA_STAGE_LABELS[target]) }));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cx(panelClass, "flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center")}>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Buscar ideas por título, ID o etiqueta...")} aria-label={tr("Buscar ideas")} className={cx(inputClass, "lg:w-72")} />
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <select value={impact} onChange={(e) => setImpact(e.target.value as IdeaImpact | "")} aria-label={tr("Impacto")} className={inputClass}>
            <option value="">{tr("Impacto: todos")}</option>
            {IDEA_IMPACTS.map((x) => (
              <option key={x} value={x}>
                {tr(x)}
              </option>
            ))}
          </select>
          <select value={lead} onChange={(e) => setLead(e.target.value as IdeaLead | "")} aria-label={tr("Líder")} className={inputClass}>
            <option value="">{tr("Líder: todos")}</option>
            {IDEA_LEADS.map((x) => (
              <option key={x} value={x}>
                {tr(x)}
              </option>
            ))}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label={tr("Etiqueta")} className={inputClass}>
            <option value="">{tr("Etiqueta: todas")}</option>
            {allTags.map((x) => (
              <option key={x} value={x}>
                #{x}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {filtersActive && (
            <Button size="sm" onClick={() => { setQuery(""); setImpact(""); setLead(""); setTag(""); }}>
              {tr("Limpiar filtros")}
            </Button>
          )}
          <Chip active={showArchived} tone="laton" onClick={() => setShowArchived(!showArchived)}>
            🗄 {tr("Archivadas ({n})", { n: archivedCount })}
          </Chip>
          <Button variant="brass" onClick={() => setCreating(true)}>
            + {tr("Sembrar idea")}
          </Button>
        </div>
      </div>

      {showArchived ? (
        <ArchivedList ideas={visible} onEdit={setEditing} />
      ) : (
        <>
          <p className="hidden text-[11px] text-(color:--tf-94A3B8-niebla) md:block">
            ✥ {tr("Arrastra las tarjetas entre columnas o usa \"Mover a…\". Todo cambio queda en el historial de la idea.")}
          </p>

          {/* Phones: one column at a time */}
          <div className="flex gap-1.5 md:hidden" role="tablist" aria-label={tr("Etapas")}>
            {IDEA_STAGES.map((s) => (
              <Chip key={s} active={mobileStage === s} tone="laton" onClick={() => setMobileStage(s)} className="flex-1 justify-center">
                <span className={cx("h-2 w-2 rounded-full", STAGE_STYLE[s].dot)} />
                {tr(IDEA_STAGE_LABELS[s]).replace(/^\d\.\s*/, "").split(" (")[0]} <span className="opacity-70">{visible.filter((i) => i.stage === s).length}</span>
              </Chip>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {IDEA_STAGES.map((stage) => {
              const list = visible.filter((i) => i.stage === stage);
              const isOver = dragOver === stage;
              return (
                <section
                  key={stage}
                  aria-label={tr(IDEA_STAGE_LABELS[stage])}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== stage) setDragOver(stage);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragged;
                    const idea = ideas.find((i) => i.id === id);
                    if (idea && idea.stage !== stage) move(idea, stage, "Movida arrastrando la tarjeta");
                    setDragged(null);
                    setDragOver(null);
                  }}
                  className={cx(
                    panelClass,
                    "flex-col gap-3 p-3 transition-all md:flex",
                    mobileStage === stage ? "flex" : "hidden",
                    isOver && "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/10 ring-2 ring-(color:--tf-22C55E-fosforo)/50"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/20 pb-2">
                    <span className={cx("flex items-center gap-1.5 text-xs font-bold uppercase", STAGE_STYLE[stage].text)}>
                      <span className={cx("h-2 w-2 rounded-full", STAGE_STYLE[stage].dot)} />
                      {tr(IDEA_STAGE_LABELS[stage])}
                    </span>
                    <Badge>{list.length}</Badge>
                  </div>
                  {list.length === 0 ? (
                    <EmptyState>{filtersActive ? tr("Ninguna idea coincide con los filtros.") : tr("No hay ideas en esta etapa.")}</EmptyState>
                  ) : (
                    list.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        focused={idea.id === focusId}
                        dragging={dragged === idea.id}
                        onDragStart={() => setDragged(idea.id)}
                        onDragEnd={() => {
                          setDragged(null);
                          setDragOver(null);
                        }}
                        onMove={(target) => move(idea, target, "Movida con el menú \"Mover a\"")}
                        onEdit={() => setEditing(idea)}
                        onHistory={() => setHistory(idea)}
                      />
                    ))
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {creating && <IdeaFormModal ideas={ideas} onClose={() => setCreating(false)} />}
      {editing && <IdeaFormModal ideas={ideas} idea={editing} onClose={() => setEditing(null)} />}
      {history && <HistoryModal idea={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function IdeaCard({
  idea,
  focused,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onEdit,
  onHistory,
}: {
  idea: IdeaItem;
  focused: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (stage: IdeaStage) => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const last = idea.history[0];
  return (
    <article
      id={`idea-${idea.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", idea.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "space-y-2 rounded-lg border bg-(color:--tf-0F121D) p-3 transition-all md:cursor-grab md:active:cursor-grabbing",
        dragging ? "scale-[0.98] border-dashed border-(color:--tf-22C55E-fosforo) opacity-40" : "border-(color:--tf-B87333-cobre)/30 hover:border-(color:--tf-E5A93C-laton)/60",
        focused && "ring-2 ring-(color:--tf-22C55E-fosforo)"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <Badge tone="fosforo">{idea.id}</Badge>
        <span className="font-medium text-(color:--tf-94A3B8-niebla)">{tr(idea.lead)}</span>
      </div>
      <h4 className="text-xs font-bold leading-snug text-(color:--tf-white)">{tr(idea.title)}</h4>
      <p className="line-clamp-3 text-[11px] leading-relaxed text-(color:--tf-94A3B8-niebla)">{tr(idea.description)}</p>
      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {idea.tags.map((t) => (
            <span key={t} className="rounded bg-(color:--tf-22D3EE-cian)/10 px-1.5 py-0.5 text-[10px] text-(color:--tf-22D3EE-cian)">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(color:--tf-B87333-cobre)/15 pt-2 text-[10px]">
        <span className="text-(color:--tf-E5A93C-laton)">
          {tr("Impacto:")} <b className="text-(color:--tf-white)">{tr(idea.impact)}</b>
        </span>
        {idea.taskId && (
          <button type="button" onClick={() => navigate("taller", idea.taskId)} className="font-bold text-(color:--tf-22C55E-fosforo) hover:underline pointer-coarse:min-h-9">
            🔧 {tr("Tarea {task} en Taller ➔", { task: idea.taskId })}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <MoveMenu current={idea.stage} onMove={onMove} />
        <IconButton label={tr("Historial ({n})", { n: idea.history.length })} onClick={onHistory}>
          🕒
        </IconButton>
        <IconButton label={tr("Editar idea")} onClick={onEdit}>
          ✏️
        </IconButton>
      </div>
      {last && (
        <div className="truncate border-t border-(color:--tf-B87333-cobre)/10 pt-1 text-[9px] text-(color:--tf-888888)">
          {tr("Último:")} <b className="text-(color:--tf-C0C0C0-plata)">{last.modifiedBy}</b> — {trv(last.action, last.vars)} · {last.timestamp.slice(0, 10)}
        </div>
      )}
    </article>
  );
}

// Works with touch: a button that opens the list of the other stages
function MoveMenu({ current, onMove }: { current: IdeaStage; onMove: (stage: IdeaStage) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-1">
      <Button size="sm" variant="cian" className="w-full" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {tr("Mover a…")} ▾
      </Button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-30 mb-1 w-full min-w-48 rounded-lg border border-(color:--tf-22D3EE-cian)/50 bg-(color:--tf-07090F-panel) p-1 shadow-2xl">
          {IDEA_STAGES.filter((s) => s !== current).map((s) => (
            <button
              key={s}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onMove(s);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-bold text-(color:--tf-C0C0C0-plata) hover:bg-(color:--tf-141829) hover:text-(color:--tf-white) pointer-coarse:min-h-11"
            >
              <span className={cx("h-2 w-2 rounded-full", STAGE_STYLE[s].dot)} />
              {IDEA_STAGES.indexOf(s) < IDEA_STAGES.indexOf(current) ? "←" : "→"} {tr(IDEA_STAGE_LABELS[s])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedList({ ideas, onEdit }: { ideas: IdeaItem[]; onEdit: (idea: IdeaItem) => void }) {
  const { me } = useSession();
  const { confirm, toast } = useFeedback();

  async function remove(idea: IdeaItem) {
    if (!(await confirm({ title: tr("¿Eliminar {id} definitivamente?", { id: idea.id }), message: tr(idea.title), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    ideasStore.set((list) => list.filter((i) => i.id !== idea.id));
    toast(tr("{id} eliminada", { id: idea.id }));
  }

  if (ideas.length === 0) return <EmptyState>{tr("No hay ideas archivadas.")}</EmptyState>;
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {ideas.map((idea) => (
        <li key={idea.id} id={`idea-${idea.id}`} className={cx(subPanelClass, "space-y-2 p-3")}>
          <div className="flex items-center justify-between gap-2">
            <Badge>{idea.id}</Badge>
            <span className={cx("text-[10px] font-bold", STAGE_STYLE[idea.stage].text)}>{tr(IDEA_STAGE_LABELS[idea.stage])}</span>
          </div>
          <h4 className="text-xs font-bold text-(color:--tf-white)">{tr(idea.title)}</h4>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                ideasStore.set((list) => list.map((i) => (i.id === idea.id ? { ...i, archived: false, history: [auditLog(me, "Idea restaurada del archivo"), ...i.history] } : i)));
                toast(tr("{id} restaurada", { id: idea.id }));
              }}
            >
              ↺ {tr("Restaurar")}
            </Button>
            <Button size="sm" onClick={() => onEdit(idea)}>
              ✏️ {tr("Editar")}
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(idea)}>
              🗑 {tr("Eliminar")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ create / edit

function IdeaFormModal({ ideas, idea, onClose }: { ideas: IdeaItem[]; idea?: IdeaItem; onClose: () => void }) {
  const { me } = useSession();
  const { toast, confirm } = useFeedback();
  const [title, setTitle] = useState(idea?.title ?? "");
  const [description, setDescription] = useState(idea?.description ?? "");
  const [lead, setLead] = useState<IdeaLead>(idea?.lead ?? me);
  const [impact, setImpact] = useState<IdeaImpact>(idea?.impact ?? "Alto");
  const [stage, setStage] = useState<IdeaStage>(idea?.stage ?? "semilla");
  const [tagsText, setTagsText] = useState(idea?.tags.join(", ") ?? "");
  const [reason, setReason] = useState("");
  const tags = parseTags(tagsText);
  const formId = idea ? `idea-edit-${idea.id}` : "idea-create";
  const nextId = nextIdeaId(ideas);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (!idea) {
      const created: IdeaItem = {
        id: nextId,
        title: title.trim(),
        description: description.trim(),
        lead,
        stage: "semilla",
        impact,
        tags,
        createdAt: todayStamp(),
        archived: false,
        history: [auditLog(me, "Idea sembrada: líder {lead}, impacto {impact}", { lead, impact })],
      };
      ideasStore.set((list) => [created, ...list]);
      if (stage !== "semilla") moveIdea(created.id, stage, me, "Etapa elegida al sembrarla");
      toast(tr("Idea {id} sembrada", { id: created.id }));
      onClose();
      return;
    }

    const changes: string[] = [];
    if (title.trim() !== idea.title) changes.push("título");
    if (description.trim() !== idea.description) changes.push("descripción");
    if (impact !== idea.impact) changes.push("impacto");
    if (lead !== idea.lead) changes.push("líder");
    if (tags.join(",") !== idea.tags.join(",")) changes.push("etiquetas");

    if (changes.length || reason.trim()) {
      const log = auditLog(me, changes.length ? "Campos editados: {fields}" : "Nota de seguimiento", changes.length ? { fields: changes.join(", ") } : undefined, reason.trim() || undefined);
      ideasStore.set((list) =>
        list.map((i) =>
          i.id === idea.id ? { ...i, title: title.trim(), description: description.trim(), impact, lead, tags, history: [log, ...i.history] } : i
        )
      );
    }
    if (stage !== idea.stage) {
      const result = moveIdea(idea.id, stage, me, reason.trim() || "Cambio desde el formulario de edición");
      if (result.created) toast(tr("Se creó la tarea {task} en Taller", { task: result.taskId ?? "" }));
    }
    toast(tr("{id} actualizada", { id: idea.id }));
    onClose();
  }

  function toggleArchive() {
    if (!idea) return;
    const archived = !idea.archived;
    ideasStore.set((list) =>
      list.map((i) => (i.id === idea.id ? { ...i, archived, history: [auditLog(me, archived ? "Idea archivada" : "Idea restaurada del archivo"), ...i.history] } : i))
    );
    toast(archived ? tr("{id} archivada", { id: idea.id }) : tr("{id} restaurada", { id: idea.id }));
    onClose();
  }

  async function remove() {
    if (!idea) return;
    const ok = await confirm({
      title: tr("¿Eliminar {id} definitivamente?", { id: idea.id }),
      message: idea.taskId ? tr("La tarea {task} de Taller no se borra; solo pierde el enlace a la idea.", { task: idea.taskId }) : tr(idea.title),
      confirmLabel: tr("Eliminar"),
      tone: "danger",
    });
    if (!ok) return;
    ideasStore.set((list) => list.filter((i) => i.id !== idea.id));
    toast(tr("{id} eliminada", { id: idea.id }));
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      size="lg"
      tone={idea ? "cian" : "laton"}
      icon={idea ? "✏️" : "💡"}
      title={idea ? tr("Editar idea {id}", { id: idea.id }) : tr("Sembrar nueva idea")}
      subtitle={idea ? tr("Los cambios quedan firmados por {name}", { name: me }) : tr("Consecutivo asignado: {id}", { id: nextId })}
      footer={
        <>
          {idea && (
            <span className="mr-auto flex gap-1.5">
              <Button size="sm" onClick={toggleArchive}>
                {idea.archived ? `↺ ${tr("Restaurar")}` : `🗄 ${tr("Archivar")}`}
              </Button>
              <Button size="sm" variant="danger" onClick={remove}>
                🗑 {tr("Eliminar")}
              </Button>
            </span>
          )}
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant="brass">
            {idea ? tr("Guardar cambios") : tr("Sembrar idea")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-3">
        <Field label={tr("Título de la iniciativa *")}>
          <input data-autofocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Ej: Integración con HSM Google Cloud")} className={inputClass} />
        </Field>
        <Field label={tr("Descripción y justificación")}>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tr("¿Qué problema resuelve y qué impacto tiene en Twoffactor?")} className={inputClass} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={tr("Etapa")}>
            <select value={stage} onChange={(e) => setStage(e.target.value as IdeaStage)} className={inputClass}>
              {IDEA_STAGES.map((s) => (
                <option key={s} value={s}>
                  {tr(IDEA_STAGE_LABELS[s])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Impacto")}>
            <select value={impact} onChange={(e) => setImpact(e.target.value as IdeaImpact)} className={inputClass}>
              {IDEA_IMPACTS.map((x) => (
                <option key={x} value={x}>
                  {tr(x)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Líder")}>
            <select value={lead} onChange={(e) => setLead(e.target.value as IdeaLead)} className={inputClass}>
              {IDEA_LEADS.map((x) => (
                <option key={x} value={x}>
                  {tr(LEAD_LABELS[x])}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={tr("Etiquetas")} hint={tr("Separadas por comas, máximo 8.")}>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder={tr("Ej: Mobile, SDK, Crypto")} className={inputClass} />
        </Field>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="rounded bg-(color:--tf-22D3EE-cian)/10 px-1.5 py-0.5 text-[10px] text-(color:--tf-22D3EE-cian)">
                #{t}
              </span>
            ))}
          </div>
        )}
        {stage === "cosecha" && !idea?.taskId && (
          <p className="rounded-lg border border-(color:--tf-22C55E-fosforo)/40 bg-(color:--tf-22C55E-fosforo)/10 p-2 text-[11px] text-(color:--tf-22C55E-fosforo)">
            {tr("Al guardarla en Cosecha se creará una tarea enlazada en el backlog de Taller.")}
          </p>
        )}
        {idea && (
          <Field label={tr("Motivo del cambio (opcional)")}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr("Ej: Ampliación de alcance para fase 2...")} className={inputClass} />
          </Field>
        )}
      </form>
    </Modal>
  );
}

function HistoryModal({ idea, onClose }: { idea: IdeaItem; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={tr("Historial de {id}", { id: idea.id })} subtitle={tr(idea.title)} icon="🕒" footer={<Button onClick={onClose}>{tr("Cerrar")}</Button>}>
      {idea.history.length === 0 ? (
        <EmptyState>{tr("Sin registros.")}</EmptyState>
      ) : (
        <ol className="space-y-2">
          {idea.history.map((log) => (
            <li key={log.id} className={cx(subPanelClass, "space-y-1 p-3")}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-(color:--tf-white)">👤 {log.modifiedBy}</span>
                <span className="font-mono text-[10px] text-(color:--tf-94A3B8-niebla)">{log.timestamp}</span>
              </div>
              <div className="text-xs font-semibold text-(color:--tf-22C55E-fosforo)">{trv(log.action, log.vars)}</div>
              {log.details && <p className="text-[11px] italic text-(color:--tf-C0C0C0-plata)">“{tr(log.details)}”</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
