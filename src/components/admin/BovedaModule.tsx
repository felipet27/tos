"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { tr } from "@/i18n/translate";
import {
  ClientRecord,
  ProjectStageId,
  STAGES_CONFIG,
  activity,
  advanceClientStage,
  getStage,
  moveClientBack,
  resubmitValidation,
  stageBlockers,
  updateClient,
  useClients,
} from "./data/clients";
import { partnerOf } from "./data/operators";
import { navigate } from "./nav";
import { useSession } from "./session";
import { useFeedback } from "./ui/feedback";
import { Badge, Button, Chip, EmptyState, ModuleHeader, cx, inputClass, matchesQuery, panelClass } from "./ui/kit";
import { StagePanel } from "./boveda/StagePanels";
import { ClientFicha } from "./boveda/ClientFicha";
import { ClientFormModal } from "./boveda/ClientFormModal";

const BAR_SIZE = 6;

export function BovedaModule({ clientId }: { clientId?: string }) {
  const { me } = useSession();
  const { toast } = useFeedback();
  const clients = useClients();

  const [showArchived, setShowArchived] = useState(false);
  const [stageFilter, setStageFilter] = useState<ProjectStageId | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ id: string; stage: ProjectStageId } | null>(null);
  const [form, setForm] = useState<"create" | "edit" | null>(null);

  const pool = useMemo(() => clients.filter((c) => c.archived === showArchived), [clients, showArchived]);
  const requested = clientId ? clients.find((c) => c.id === clientId.toUpperCase()) : undefined;
  const selected: ClientRecord | undefined = requested ?? (clientId ? undefined : pool[0]);
  const archivedCount = clients.filter((c) => c.archived).length;

  const stageCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    pool.forEach((c) => (counts[c.currentStage] = (counts[c.currentStage] ?? 0) + 1));
    return counts;
  }, [pool]);

  const barClients = useMemo(() => {
    if (stageFilter !== null) return pool.filter((c) => c.currentStage === stageFilter).slice(0, BAR_SIZE);
    const ordered = [selected?.id, ...recentIds, ...pool.map((c) => c.id)].filter((id): id is string => !!id);
    return Array.from(new Set(ordered))
      .map((id) => pool.find((c) => c.id === id))
      .filter((c): c is ClientRecord => !!c)
      .slice(0, BAR_SIZE);
  }, [pool, recentIds, selected?.id, stageFilter]);

  function selectClient(id: string) {
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, BAR_SIZE));
    setViewing(null);
    navigate("boveda", id);
  }

  function toggleStageFilter(stage: ProjectStageId | null) {
    const next = stage === null || stageFilter === stage ? null : stage;
    setStageFilter(next);
    if (next !== null && selected?.currentStage !== next) {
      const match = pool.find((c) => c.currentStage === next);
      if (match) navigate("boveda", match.id, undefined, { replace: true });
    }
  }

  function toggleArchivedView() {
    setShowArchived(!showArchived);
    setStageFilter(null);
    navigate("boveda", undefined, undefined, { replace: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <ModuleHeader
        title={tr("BÓVEDA // CLIENTES")}
        subtitle={tr("Expedientes por etapa con doble validación entre socios.")}
        actions={
          <>
            <Chip active={showArchived} tone="laton" onClick={toggleArchivedView}>
              🗄 {tr("Archivados ({n})", { n: archivedCount })}
            </Chip>
            <Button variant="outline" onClick={() => setForm("create")}>
              + {tr("Anexar Cliente")}
            </Button>
          </>
        }
      />

      {/* Stage filters: one scrollable row on phones */}
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar" role="toolbar" aria-label={tr("Filtrar por etapa")}>
        <Chip active={stageFilter === null} onClick={() => toggleStageFilter(null)}>
          {tr("TODOS")} <span className="opacity-70">{pool.length}</span>
        </Chip>
        {STAGES_CONFIG.map((s) => (
          <Chip key={s.id} active={stageFilter === s.id} tone="laton" onClick={() => toggleStageFilter(s.id)}>
            <span className="rounded border border-current px-1 text-[10px] font-black">{s.sigla}</span>
            {tr(s.shortName)} <span className="opacity-70">{stageCounts[s.id] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {/* Search + quick access */}
      <div className={cx(panelClass, "flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center")}>
        <ClientSearch clients={clients} pool={pool} selectedId={selected?.id} onSelect={selectClient} />
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-(color:--tf-94A3B8-niebla)">
            {stageFilter !== null ? tr("En etapa {sigla}:", { sigla: getStage(stageFilter).sigla }) : showArchived ? tr("Archivados:") : tr("Recientes:")}
          </span>
          {barClients.map((c) => {
            const isSelected = selected?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectClient(c.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cx(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all pointer-coarse:min-h-10",
                  isSelected
                    ? "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)"
                    : "border-(color:--tf-B87333-cobre)/35 bg-(color:--tf-black)/50 text-(color:--tf-C0C0C0-plata) hover:border-(color:--tf-E5A93C-laton) hover:text-(color:--tf-white)"
                )}
              >
                {tr(c.name)}
                <span className="rounded border border-current/40 px-1 text-[10px] font-black opacity-80">{getStage(c.currentStage).sigla}</span>
              </button>
            );
          })}
          {barClients.length === 0 && <span className="text-xs italic text-(color:--tf-94A3B8-niebla)">{tr("No hay clientes en esta vista.")}</span>}
        </div>
      </div>

      {clientId && !requested ? (
        <EmptyState className="py-10">
          <p className="mb-3 text-sm font-bold text-(color:--tf-white)">{tr("No existe ningún cliente con el ID {id}.", { id: clientId })}</p>
          <Button onClick={() => navigate("boveda")}>{tr("Ir al primer cliente")}</Button>
        </EmptyState>
      ) : !selected ? (
        <EmptyState className="py-10">
          <p className="mb-3">{showArchived ? tr("No hay clientes archivados.") : tr("Aún no hay clientes en la Bóveda.")}</p>
          {!showArchived && (
            <Button variant="outline" onClick={() => setForm("create")}>
              + {tr("Anexar Cliente")}
            </Button>
          )}
        </EmptyState>
      ) : (
        <ClientDossier
          key={selected.id}
          client={selected}
          activeStage={viewing?.id === selected.id ? viewing.stage : selected.currentStage}
          onViewStage={(stage) => setViewing({ id: selected.id, stage })}
          onEdit={() => setForm("edit")}
          onAdvanced={() => setViewing(null)}
        />
      )}

      {form && (
        <ClientFormModal
          mode={form}
          client={form === "edit" ? selected : undefined}
          clients={clients}
          me={me}
          onClose={() => setForm(null)}
          onSaved={(id) => {
            const created = form === "create";
            setForm(null);
            if (created) {
              setShowArchived(false);
              selectClient(id);
              toast(tr("Cliente {id} registrado. La etapa de levantamiento queda pendiente del visto bueno de {name}.", { id, name: partnerOf(me) }));
            } else {
              toast(tr("Expediente actualizado"));
            }
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ search

function ClientSearch({
  clients,
  pool,
  selectedId,
  onSelect,
}: {
  clients: ClientRecord[];
  pool: ClientRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const results = query.trim() ? clients.filter((c) => matchesQuery(query, c.name, c.id, c.industry, c.contactName)) : pool;

  return (
    <div ref={containerRef} className="relative w-full shrink-0 sm:w-64">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) {
            onSelect(results[0].id);
            setQuery("");
            setOpen(false);
          }
        }}
        placeholder={tr("Buscar cliente...")}
        aria-label={tr("Buscar cliente")}
        className={inputClass}
      />
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 max-h-80 w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-(color:--tf-22C55E-fosforo)/50 bg-(color:--tf-07090F-panel) p-1.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/25 px-2 py-1 text-[10px] font-bold uppercase text-(color:--tf-E5A93C-laton)">
            {query.trim() ? tr("Resultados ({count})", { count: results.length }) : tr("Directorio ({count})", { count: results.length })}
          </div>
          {results.length === 0 ? (
            <p className="p-3 text-center text-xs text-(color:--tf-888888)">{tr("Ningún cliente coincide con \"{query}\".", { query })}</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left text-xs transition-colors pointer-coarse:min-h-12",
                  selectedId === c.id ? "bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-C0C0C0-plata) hover:bg-(color:--tf-141829) hover:text-(color:--tf-white)"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{tr(c.name)}</span>
                  <span className="block truncate text-[10px] text-(color:--tf-94A3B8-niebla)">
                    {c.id} • {tr(c.industry)}
                    {c.archived ? ` • ${tr("Archivado")}` : ""}
                  </span>
                </span>
                <Badge tone="laton">{getStage(c.currentStage).sigla}</Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ dossier

function ClientDossier({
  client,
  activeStage,
  onViewStage,
  onEdit,
  onAdvanced,
}: {
  client: ClientRecord;
  activeStage: ProjectStageId;
  onViewStage: (stage: ProjectStageId) => void;
  onEdit: () => void;
  onAdvanced: () => void;
}) {
  const { me } = useSession();
  const { toast, prompt } = useFeedback();
  const partner = partnerOf(me);
  const blockers = stageBlockers(client);
  const nextStage = client.currentStage < 5 ? getStage(client.currentStage + 1) : null;
  const canAdvance = !!nextStage && blockers.length === 0 && !client.archived;
  const viewingEarlier = activeStage < client.currentStage;

  const myPending = client.stageValidations.filter((v) => v.status === "pendiente" && v.author === me);
  const toReview = client.stageValidations.filter((v) => v.status === "pendiente" && v.author !== me);
  const sentBackToMe = client.stageValidations.filter((v) => v.status === "cambios" && v.author === me);
  const sentBackToPartner = client.stageValidations.filter((v) => v.status === "cambios" && v.author !== me);

  async function advance() {
    if (!nextStage) return;
    const summary = await prompt({
      title: tr("Pasar {client} a {stage}", { client: client.name, stage: tr(nextStage.name) }),
      message: tr("La nueva etapa quedará pendiente del visto bueno de {name} antes de poder seguir avanzando.", { name: partner }),
      label: tr("Resumen del trabajo para la revisión (opcional)"),
      multiline: true,
      confirmLabel: tr("Pasar a {stage}", { stage: tr(nextStage.shortName) }),
    });
    if (summary === null) return;
    updateClient(client.id, (c) => advanceClientStage(c, me, summary));
    onAdvanced();
    toast(tr("{client} pasó a {stage}. Pendiente del visto bueno de {name}.", { client: client.name, stage: tr(nextStage.name), name: partner }));
  }

  async function moveBack() {
    const target = getStage(activeStage);
    const reason = await prompt({
      title: tr("¿Regresar {client} a {stage}?", { client: client.name, stage: tr(target.name) }),
      message: tr("Se retiran los vistos buenos de las etapas posteriores: cuando vuelva a avanzar, {name} tendrá que aprobarlas de nuevo.", { name: partner }),
      label: tr("Motivo del regreso *"),
      required: true,
      multiline: true,
      confirmLabel: tr("Regresar a {stage}", { stage: tr(target.shortName) }),
      tone: "danger",
    });
    if (reason === null) return;
    updateClient(client.id, (c) => moveClientBack(c, target.id), activity(me, "Cliente regresado a la etapa {stage}: {reason}", { stage: target.name, reason }));
    onAdvanced();
    toast(tr("{client} regresó a {stage}", { client: client.name, stage: tr(target.name) }));
  }

  async function resubmit(stageId: ProjectStageId) {
    const v = client.stageValidations.find((x) => x.stageId === stageId);
    if (!v) return;
    const summary = await prompt({
      title: tr("Reenviar [{sigla}] {stage} a revisión", { sigla: v.sigla, stage: tr(v.stageName) }),
      message: v.validationNote ? tr("Comentario de {name}: “{note}”", { name: partner, note: v.validationNote }) : undefined,
      label: tr("¿Qué cambiaste?"),
      required: true,
      multiline: true,
      confirmLabel: tr("Reenviar a {name}", { name: partner }),
    });
    if (summary === null) return;
    updateClient(client.id, (c) => resubmitValidation(c, stageId, me, summary));
    toast(tr("Etapa reenviada a {name}", { name: partner }));
  }

  return (
    <div className={cx(panelClass, "space-y-4 bg-(color:--tf-0B0D16) p-3 sm:p-5")}>
      {client.archived && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(color:--tf-E5A93C-laton)/50 bg-(color:--tf-E5A93C-laton)/10 p-2.5 text-xs text-(color:--tf-E5A93C-laton)">
          <span>🗄 {tr("Cliente archivado el {date}. No aparece en los contadores ni en Observatorio.", { date: client.archivedAt ?? "—" })}</span>
          <Button
            size="sm"
            variant="warn"
            onClick={() => {
              updateClient(client.id, (c) => ({ ...c, archived: false, archivedAt: undefined }), activity(me, "Cliente restaurado del archivo"));
              toast(tr("{client} restaurado", { client: client.name }));
            }}
          >
            ↺ {tr("Restaurar")}
          </Button>
        </div>
      )}

      {/* Client header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-(color:--tf-B87333-cobre)/25 pb-3">
        <h3 className="text-base font-bold tracking-wide text-(color:--tf-white) sm:text-lg">{tr(client.name)}</h3>
        <Badge tone="laton">{client.id}</Badge>
        <span className="text-xs text-(color:--tf-94A3B8-niebla)">• {tr(client.industry)}</span>
        <Badge tone={client.status === "Activo" ? "fosforo" : "muted"}>{tr(client.status)}</Badge>
      </div>

      {/* Stage stepper */}
      <div className="space-y-2">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1 no-scrollbar" role="tablist" aria-label={tr("Etapas del proyecto")}>
          {STAGES_CONFIG.map((s, i) => {
            const v = client.stageValidations.find((x) => x.stageId === s.id);
            const isCurrent = client.currentStage === s.id;
            const isViewing = activeStage === s.id;
            const reached = s.id <= client.currentStage;
            return (
              <Fragment key={s.id}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isViewing}
                  onClick={() => onViewStage(s.id)}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all pointer-coarse:min-h-10",
                    isViewing && "ring-2 ring-(color:--tf-white)/80",
                    isCurrent
                      ? "border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/20 text-(color:--tf-E5A93C-laton)"
                      : reached
                      ? "border-(color:--tf-22C55E-fosforo)/50 bg-(color:--tf-22C55E-fosforo)/10 text-(color:--tf-22C55E-fosforo)"
                      : "border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 text-(color:--tf-64748B)"
                  )}
                >
                  <span className="font-black">{s.sigla}</span>
                  <span className="hidden font-normal lg:inline">{tr(s.name)}</span>
                  {v && (
                    <span aria-label={tr(v.status === "aprobado" ? "Aprobada" : v.status === "cambios" ? "Con cambios solicitados" : "Pendiente")}>
                      {v.status === "aprobado" ? "✓" : v.status === "cambios" ? "↺" : "⏳"}
                    </span>
                  )}
                  {isCurrent && <span className="rounded bg-(color:--tf-E5A93C-laton) px-1 text-[9px] font-extrabold uppercase text-(color:--tf-black)">{tr("ACTUAL")}</span>}
                </button>
                {i < STAGES_CONFIG.length - 1 && (
                  <span className="shrink-0 text-[10px] text-(color:--tf-B87333-cobre)/40" aria-hidden>
                    ➔
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Stage actions: always visible, not hidden at the end of the scroll */}
        <div className="flex flex-wrap items-center gap-2">
          {nextStage ? (
            <Button variant="brass" onClick={advance} disabled={!canAdvance}>
              {tr("Pasar a {stage}", { stage: tr(nextStage.shortName) })} ➔
            </Button>
          ) : (
            <Badge tone="fosforo">✓ {tr("EN PRODUCCIÓN")}</Badge>
          )}
          {viewingEarlier && !client.archived && (
            <Button variant="danger" size="sm" onClick={moveBack}>
              ↩ {tr("Regresar a {stage}", { stage: tr(getStage(activeStage).shortName) })}
            </Button>
          )}
          {nextStage && blockers.length > 0 && (
            <span className="text-[11px] text-(color:--tf-94A3B8-niebla)">
              {tr("Para avanzar falta el visto bueno de: {list}", {
                list: blockers.map((b) => `[${b.sigla}] ${partnerOf(b.author)}`).join(", "),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Two-man rule status */}
      {(myPending.length > 0 || toReview.length > 0 || sentBackToMe.length > 0 || sentBackToPartner.length > 0) && (
        <div className="space-y-2">
          {toReview.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(color:--tf-E5A93C-laton)/50 bg-(color:--tf-E5A93C-laton)/10 p-2.5 text-xs text-(color:--tf-E5A93C-laton)">
              <span>
                <strong className="text-(color:--tf-white)">{tr("Te toca revisar:")}</strong> {toReview.map((v) => `[${v.sigla}] ${tr(v.stageName)}`).join(", ")} —{" "}
                {tr("registradas por {name}.", { name: partner })}
              </span>
              <Button size="sm" variant="warn" onClick={() => navigate("observatorio")}>
                {tr("Revisar en Observatorio ➔")}
              </Button>
            </div>
          )}
          {sentBackToMe.map((v) => (
            <div key={v.stageId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/40 p-2.5 text-xs text-(color:--tf-red-300)">
              <span>
                <strong>{tr("{name} pidió cambios en [{sigla}] {stage}:", { name: partner, sigla: v.sigla, stage: tr(v.stageName) })}</strong> {v.validationNote ?? ""}
              </span>
              <Button size="sm" variant="danger" onClick={() => resubmit(v.stageId)}>
                {tr("Reenviar a revisión")}
              </Button>
            </div>
          ))}
          {myPending.length > 0 && (
            <p className="rounded-xl border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 p-2.5 text-xs text-(color:--tf-94A3B8-niebla)">
              ⏳ {tr("Esperando el visto bueno de {name} para:", { name: partner })} {myPending.map((v) => `[${v.sigla}] ${tr(v.stageName)}`).join(", ")}
            </p>
          )}
          {sentBackToPartner.length > 0 && (
            <p className="rounded-xl border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 p-2.5 text-xs text-(color:--tf-94A3B8-niebla)">
              ↺ {tr("Pediste cambios a {name} en:", { name: partner })} {sentBackToPartner.map((v) => `[${v.sigla}] ${tr(v.stageName)}`).join(", ")}
            </p>
          )}
        </div>
      )}

      <StagePanel key={`${client.id}-${activeStage}`} client={client} me={me} stageId={activeStage} />

      <ClientFicha client={client} me={me} onEdit={onEdit} />
    </div>
  );
}
