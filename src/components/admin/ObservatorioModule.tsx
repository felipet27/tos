"use client";

import { ReactNode, useMemo, useState } from "react";
import { tr } from "@/i18n/translate";
import { ClientRecord, STAGES_CONFIG, getStage, resubmitValidation, reviewValidation, updateClient, useClients } from "./data/clients";
import { OPERATOR_NODES, partnerOf } from "./data/operators";
import { PLAN_NAMES, getPlan } from "./data/plans";
import { reviewTask, tasksStore } from "./data/tasks";
import { ReviewItem, changesRequestedToMe, needsMyReview, useReviewItems } from "./data/reviews";
import { todayStamp } from "./data/time";
import { navigate } from "./nav";
import { useSession } from "./session";
import { useFeedback } from "./ui/feedback";
import { Modal } from "./ui/Modal";
import { Badge, Button, Chip, EmptyState, ModuleHeader, cx, inputClass, labelClass, matchesQuery, panelClass, subPanelClass } from "./ui/kit";

type QueueFilter = "mias" | "cambios" | "socio" | "aprobados" | "todas";
type KindFilter = "todas" | "etapa" | "tarea";
type View = "integral" | "bandeja" | "censo";

const REVIEW_ACTIONS: Record<string, string> = {
  aprobado: "dio el visto bueno",
  cambios: "pidió cambios",
  reenviado: "reenvió a revisión",
};

export function ObservatorioModule() {
  const { me } = useSession();
  const { toast, confirm, prompt } = useFeedback();
  const clients = useClients();
  const items = useReviewItems();

  const [view, setView] = useState<View>("integral");
  const [filter, setFilter] = useState<QueueFilter>("mias");
  const [kind, setKind] = useState<KindFilter>("todas");
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<ReviewItem | null>(null);

  const partner = partnerOf(me);
  const counts = useMemo(
    () => ({
      mias: items.filter((i) => needsMyReview(i, me)).length,
      cambios: items.filter((i) => changesRequestedToMe(i, me)).length,
      socio: items.filter((i) => i.status === "pendiente" && i.author === me).length,
      aprobados: items.filter((i) => i.status === "aprobado").length,
      todas: items.length,
    }),
    [items, me]
  );

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (filter === "mias" && !needsMyReview(i, me)) return false;
        if (filter === "cambios" && !changesRequestedToMe(i, me)) return false;
        if (filter === "socio" && !(i.status === "pendiente" && i.author === me)) return false;
        if (filter === "aprobados" && i.status !== "aprobado") return false;
        if (kind !== "todas" && i.kind !== kind) return false;
        return matchesQuery(query, i.title, i.subtitle, i.summary, i.author, i.validation?.stageName, i.badge);
      }),
    [items, filter, kind, query, me]
  );

  // Clients with 2+ stages waiting for me can be signed in one go
  const batchCandidates = useMemo(() => {
    const map = new Map<string, { client: ClientRecord; stages: ReviewItem[] }>();
    items
      .filter((i) => i.kind === "etapa" && needsMyReview(i, me) && i.client)
      .forEach((i) => {
        const group = map.get(i.client!.id) ?? { client: i.client!, stages: [] };
        group.stages.push(i);
        map.set(i.client!.id, group);
      });
    return Array.from(map.values()).filter((g) => g.stages.length >= 2);
  }, [items, me]);

  function decide(item: ReviewItem, decision: "aprobado" | "cambios", note: string) {
    if (item.kind === "etapa" && item.client && item.validation) {
      const stageId = item.validation.stageId;
      updateClient(item.client.id, (c) => reviewValidation(c, stageId, me, decision, note));
    } else if (item.task) {
      const taskId = item.task.id;
      tasksStore.set((list) => list.map((t) => (t.id === taskId ? reviewTask(t, me, decision, note) : t)));
    }
    toast(
      decision === "aprobado"
        ? tr("✓ Visto bueno registrado para {item}", { item: `${item.title} [${item.badge}]` })
        : tr("↺ Cambios solicitados a {name} en {item}", { name: item.author, item: `${item.title} [${item.badge}]` }),
      decision === "aprobado" ? "ok" : "warn"
    );
  }

  async function batchApprove(group: { client: ClientRecord; stages: ReviewItem[] }) {
    const ok = await confirm({
      title: tr("¿Aprobar {n} etapas de {client}?", { n: group.stages.length, client: group.client.name }),
      message: group.stages.map((s) => `[${s.badge}] ${tr(s.validation?.stageName)}`).join(" · "),
      confirmLabel: tr("Aprobar en lote"),
    });
    if (!ok) return;
    updateClient(group.client.id, (c) =>
      group.stages.reduce((acc, s) => reviewValidation(acc, s.validation!.stageId, me, "aprobado", "Aprobación en lote."), c)
    );
    toast(tr("✓ {n} etapas de {client} aprobadas", { n: group.stages.length, client: group.client.name }));
  }

  async function resubmit(item: ReviewItem) {
    if (item.kind === "tarea" && item.task) {
      navigate("taller", item.task.id);
      return;
    }
    if (!item.client || !item.validation) return;
    const summary = await prompt({
      title: tr("Reenviar [{sigla}] {stage} a revisión", { sigla: item.badge, stage: tr(item.validation.stageName) }),
      message: item.note ? tr("Comentario de {name}: “{note}”", { name: partner, note: item.note }) : undefined,
      label: tr("¿Qué cambiaste?"),
      required: true,
      multiline: true,
      confirmLabel: tr("Reenviar a {name}", { name: partner }),
    });
    if (summary === null) return;
    const stageId = item.validation.stageId;
    updateClient(item.client.id, (c) => resubmitValidation(c, stageId, me, summary));
    toast(tr("Etapa reenviada a {name}", { name: partner }));
  }

  function openItem(item: ReviewItem) {
    if (item.kind === "etapa" && item.client) navigate("boveda", item.client.id);
    else if (item.task) navigate("taller", item.task.id);
  }

  function exportCsv() {
    const header = [
      tr("Tipo"),
      tr("Referencia"),
      tr("Cliente / Tarea"),
      tr("Etapa"),
      tr("Autor"),
      tr("Registrada"),
      tr("Estado"),
      tr("Revisor"),
      tr("Fecha de revisión"),
      tr("Nota del revisor"),
      tr("Resumen"),
      tr("Historial"),
    ];
    const rows = items.map((i) => [
      i.kind === "etapa" ? tr("Etapa") : tr("Tarea"),
      i.kind === "etapa" ? i.client?.id ?? "" : i.task?.id ?? "",
      tr(i.title),
      i.kind === "etapa" ? `[${i.badge}] ${tr(i.validation?.stageName)}` : "QA",
      i.author,
      i.requestedAt,
      tr(i.status),
      i.reviewedBy ?? (i.status === "pendiente" ? i.reviewer : ""),
      i.reviewedAt ?? "",
      i.note ?? "",
      tr(i.summary),
      i.history.map((h) => `${h.at} ${h.by}: ${tr(REVIEW_ACTIONS[h.action])}${h.note ? ` (${h.note})` : ""}`).join(" | "),
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    // BOM + ";" so Excel in Spanish opens it in columns
    const csv = "﻿" + [header, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-tos-${todayStamp()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(tr("Auditoría exportada ({n} registros)", { n: rows.length }));
  }

  // ---- KPIs computed from the records
  const active = clients.filter((c) => !c.archived);
  const inProduction = active.filter((c) => c.currentStage === 5);
  const prodPct = active.length ? Math.round((inProduction.length / active.length) * 100) : 0;
  const alerts = inProduction.reduce((acc, c) => acc + c.produccionNotes.filter((n) => n.type === "alerta").length, 0);
  const totalNodes = active.reduce((acc, c) => acc + c.nodesAssigned, 0);
  const byPlan = PLAN_NAMES.map((p) => `${tr(p)} ${active.filter((c) => c.plan === p).length}`).join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        accent="cian"
        title={tr("OBSERVATORIO // AUDITORÍA 2-MAN RULE")}
        subtitle={tr("Lo que registra un socio lo valida el otro: etapas de clientes y tareas en QA.")}
        actions={
          <>
            <Badge tone="fosforo">
              {tr("Revisando como:")} {me} [{OPERATOR_NODES[me]}]
            </Badge>
            <Button size="sm" variant="cian" onClick={exportCsv}>
              ⬇ {tr("Exportar CSV")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label={tr("Clientes activos")} value={active.length} hint={tr("{n} archivados", { n: clients.length - active.length })} tone="fosforo" onClick={() => navigate("boveda")} />
        <Kpi
          label={tr("En producción [P]")}
          value={`${inProduction.length} (${prodPct}%)`}
          hint={alerts > 0 ? tr("{n} alertas en bitácoras", { n: alerts }) : tr("Sin alertas en bitácoras")}
          tone={alerts > 0 ? "danger" : "laton"}
        />
        <Kpi
          label={tr("Esperan tu acción")}
          value={counts.mias + counts.cambios}
          hint={tr("{a} por revisar · {b} con cambios pedidos", { a: counts.mias, b: counts.cambios })}
          tone={counts.mias + counts.cambios > 0 ? "laton" : "fosforo"}
          onClick={() => {
            setView("bandeja");
            setFilter(counts.mias > 0 || counts.cambios === 0 ? "mias" : "cambios");
          }}
        />
        <Kpi label={tr("Nodos asignados")} value={totalNodes} hint={byPlan} tone="cian" />
      </div>

      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        <Chip active={view === "integral"} onClick={() => setView("integral")}>
          {tr("Vista completa")}
        </Chip>
        <Chip active={view === "bandeja"} tone="laton" onClick={() => setView("bandeja")}>
          {tr("Bandeja de vistos buenos")}
          {counts.mias > 0 && <span className="rounded bg-(color:--tf-E5A93C-laton) px-1.5 text-[10px] font-black text-(color:--tf-black)">{counts.mias}</span>}
        </Chip>
        <Chip active={view === "censo"} tone="cian" onClick={() => setView("censo")}>
          {tr("Censo de clientes")}
        </Chip>
      </div>

      {(view === "integral" || view === "bandeja") && (
        <section className={cx(panelClass, "space-y-3 border-(color:--tf-E5A93C-laton)/40 p-3 sm:p-4")}>
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("Bandeja de vistos buenos")}</div>
            <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">
              {tr("Solo puedes aprobar o pedir cambios sobre lo que registró {name}; lo tuyo lo revisa {name}.", { name: partner })}
            </p>
            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
              <Chip active={filter === "mias"} tone="laton" onClick={() => setFilter("mias")}>
                ⚠ {tr("Requieren mi visto bueno")} <span className="opacity-70">{counts.mias}</span>
              </Chip>
              <Chip active={filter === "cambios"} tone="laton" onClick={() => setFilter("cambios")}>
                ↺ {tr("Cambios pedidos a mí")} <span className="opacity-70">{counts.cambios}</span>
              </Chip>
              <Chip active={filter === "socio"} tone="cian" onClick={() => setFilter("socio")}>
                ⏳ {tr("Esperando a {name}", { name: partner })} <span className="opacity-70">{counts.socio}</span>
              </Chip>
              <Chip active={filter === "aprobados"} onClick={() => setFilter("aprobados")}>
                ✓ {tr("Aprobados")} <span className="opacity-70">{counts.aprobados}</span>
              </Chip>
              <Chip active={filter === "todas"} onClick={() => setFilter("todas")}>
                {tr("Todas")} <span className="opacity-70">{counts.todas}</span>
              </Chip>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} className={cx(inputClass, "sm:w-52")} aria-label={tr("Tipo")}>
                <option value="todas">{tr("Etapas y tareas")}</option>
                <option value="etapa">{tr("Solo etapas de clientes")}</option>
                <option value="tarea">{tr("Solo tareas de Taller")}</option>
              </select>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Filtrar por cliente, tarea, etapa o autor...")} className={inputClass} />
            </div>
          </div>

          {filter !== "aprobados" &&
            batchCandidates.map((g) => (
              <div key={g.client.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/10 p-3 text-xs">
                <span>
                  <strong className="text-(color:--tf-white)">{tr("Validación en lote:")}</strong> {tr(g.client.name)}{" "}
                  {tr("tiene {n} etapas de {name} esperando tu visto bueno.", { n: g.stages.length, name: partner })}
                </span>
                <Button size="sm" variant="primary" onClick={() => batchApprove(g)}>
                  ✓ {tr("Aprobar {n} en lote", { n: g.stages.length })}
                </Button>
              </div>
            ))}

          {filtered.length === 0 ? (
            <EmptyState>
              {filter === "mias" ? (
                <>
                  <strong className="block text-sm text-(color:--tf-22C55E-fosforo)">{tr("✓ ¡Al día! No tienes nada pendiente de visto bueno.")}</strong>
                  {tr("Cuando {name} registre una etapa o envíe una tarea a QA aparecerá aquí.", { name: partner })}
                </>
              ) : (
                tr("No hay registros para los filtros seleccionados.")
              )}
            </EmptyState>
          ) : (
            <>
              {/* Phones: cards */}
              <ul className="space-y-2 md:hidden">
                {filtered.map((item) => (
                  <li key={item.key} className={cx(subPanelClass, "space-y-2 p-3", needsMyReview(item, me) && "border-(color:--tf-E5A93C-laton)/60")}>
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => openItem(item)} className="min-w-0 text-left">
                        <span className="block truncate text-xs font-bold text-(color:--tf-white) underline-offset-2 hover:underline">{tr(item.title)}</span>
                        <span className="block truncate text-[10px] text-(color:--tf-94A3B8-niebla)">{item.subtitle}</span>
                      </button>
                      <Badge tone="laton">{item.badge}</Badge>
                    </div>
                    <p className="text-[11px] text-(color:--tf-C0C0C0-plata)">
                      {item.kind === "etapa" ? tr(item.validation?.stageName) : tr("QA de tarea")} · {item.author} · {item.requestedAt}
                    </p>
                    {item.kind === "etapa" && <p className="line-clamp-3 text-[11px] italic text-(color:--tf-94A3B8-niebla)">“{tr(item.summary)}”</p>}
                    <StatusBadge item={item} />
                    <div className="flex justify-end">
                      <ItemActions item={item} onReview={() => setReviewing(item)} onQuickApprove={() => decide(item, "aprobado", "")} onResubmit={() => resubmit(item)} />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs text-(color:--tf-C0C0C0-plata)">
                  <thead>
                    <tr className="border-b border-(color:--tf-B87333-cobre)/30 text-[10px] uppercase tracking-wider text-(color:--tf-E5A93C-laton)">
                      <th className="px-3 py-2.5">{tr("Cliente / Tarea")}</th>
                      <th className="px-3 py-2.5">{tr("Qué se revisa")}</th>
                      <th className="px-3 py-2.5">{tr("Autor")}</th>
                      <th className="px-3 py-2.5">{tr("Resumen")}</th>
                      <th className="px-3 py-2.5">{tr("Estado")}</th>
                      <th className="px-3 py-2.5 text-right">{tr("Acción")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(color:--tf-B87333-cobre)/15">
                    {filtered.map((item) => (
                      <tr key={item.key} className={cx("transition-colors hover:bg-(color:--tf-121626)", needsMyReview(item, me) && "bg-(color:--tf-E5A93C-laton)/5")}>
                        <td className="px-3 py-2.5">
                          <button type="button" onClick={() => openItem(item)} className="text-left" title={item.kind === "etapa" ? tr("Abrir expediente en Bóveda") : tr("Abrir tarea en Taller")}>
                            <span className="block font-bold text-(color:--tf-white) underline-offset-2 hover:underline">{tr(item.title)}</span>
                            <span className="block font-mono text-[10px] text-(color:--tf-94A3B8-niebla)">{item.subtitle}</span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <Badge tone="laton">{item.badge}</Badge>{" "}
                          <span className="text-(color:--tf-white)">{item.kind === "etapa" ? tr(item.validation?.stageName) : tr("QA de tarea")}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <div className="font-bold text-(color:--tf-white)">{item.author}</div>
                          <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">{item.requestedAt}</div>
                        </td>
                        <td className="max-w-xs px-3 py-2.5">
                          <div className="line-clamp-2 text-[11px]">{tr(item.summary)}</div>
                          {item.note && <div className="mt-0.5 truncate text-[10px] italic text-(color:--tf-22C55E-fosforo)">“{tr(item.note)}”</div>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <StatusBadge item={item} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          <ItemActions item={item} onReview={() => setReviewing(item)} onQuickApprove={() => decide(item, "aprobado", "")} onResubmit={() => resubmit(item)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {(view === "integral" || view === "censo") && (
        <Census
          clients={active}
          onOpenQueue={(name) => {
            setView("bandeja");
            setFilter("todas");
            setQuery(name);
          }}
        />
      )}

      {reviewing && (
        <ReviewModal
          item={reviewing}
          onClose={() => setReviewing(null)}
          onDecide={(d, note) => {
            decide(reviewing, d, note);
            setReviewing(null);
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, hint, tone, onClick }: { label: string; value: ReactNode; hint: string; tone: "fosforo" | "laton" | "cian" | "danger"; onClick?: () => void }) {
  const toneClass =
    tone === "laton" ? "text-(color:--tf-E5A93C-laton)" : tone === "cian" ? "text-(color:--tf-22D3EE-cian)" : tone === "danger" ? "text-(color:--tf-red-400)" : "text-(color:--tf-22C55E-fosforo)";
  const content = (
    <>
      <div className="text-[10px] font-bold uppercase text-(color:--tf-94A3B8-niebla)">{label}</div>
      <div className={cx("text-xl font-bold sm:text-2xl", toneClass)}>{value}</div>
      <div className="truncate text-[10px] text-(color:--tf-94A3B8-niebla)" title={hint}>
        {hint}
      </div>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(panelClass, "space-y-1 p-3 text-left transition-colors hover:border-(color:--tf-E5A93C-laton)/70")}>
      {content}
    </button>
  ) : (
    <div className={cx(panelClass, "space-y-1 p-3")}>{content}</div>
  );
}

function StatusBadge({ item }: { item: ReviewItem }) {
  const { me } = useSession();
  if (item.status === "aprobado")
    return (
      <span className="inline-block space-y-0.5">
        <Badge tone="fosforo">✓ {tr("APROBADO")}</Badge>
        <span className="block text-[9px] text-(color:--tf-94A3B8-niebla)">
          {item.reviewedBy} · {item.reviewedAt}
        </span>
      </span>
    );
  if (item.status === "cambios")
    return (
      <span className="inline-block space-y-0.5">
        <Badge tone="danger">↺ {tr("CAMBIOS PEDIDOS")}</Badge>
        {item.note && <span className="block max-w-56 truncate text-[10px] italic text-(color:--tf-red-300)">“{item.note}”</span>}
      </span>
    );
  return needsMyReview(item, me) ? (
    <Badge tone="laton">⚠ {tr("REQUIERE TU VISTO BUENO")}</Badge>
  ) : (
    <Badge>⏳ {tr("ESPERANDO A {name}", { name: item.reviewer.toUpperCase() })}</Badge>
  );
}

function ItemActions({ item, onReview, onQuickApprove, onResubmit }: { item: ReviewItem; onReview: () => void; onQuickApprove: () => void; onResubmit: () => void }) {
  const { me } = useSession();
  if (needsMyReview(item, me))
    return (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="primary" onClick={onQuickApprove}>
          ✓ {tr("Visto bueno")}
        </Button>
        <Button size="sm" variant="warn" onClick={onReview}>
          {tr("Revisar / pedir cambios")}
        </Button>
      </span>
    );
  if (changesRequestedToMe(item, me))
    return (
      <Button size="sm" variant="danger" onClick={onResubmit}>
        {item.kind === "tarea" ? tr("Corregir en Taller ➔") : tr("Reenviar a revisión")}
      </Button>
    );
  return <span className="text-[10px] italic text-(color:--tf-64748B)">{item.status === "aprobado" ? tr("[SELLADO]") : tr("Sin acción para ti")}</span>;
}

function ReviewModal({ item, onClose, onDecide }: { item: ReviewItem; onClose: () => void; onDecide: (decision: "aprobado" | "cambios", note: string) => void }) {
  const { me } = useSession();
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      tone="fosforo"
      icon="✓"
      title={tr("Revisión 2-Man Rule")}
      subtitle={`${tr(item.title)} · ${item.kind === "etapa" ? `[${item.badge}] ${tr(item.validation?.stageName)}` : tr("QA de tarea")}`}
      dismissible={!note}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!note.trim()) {
                setError(true);
                return;
              }
              onDecide("cambios", note);
            }}
          >
            ↺ {tr("Pedir cambios")}
          </Button>
          <Button variant="primary" onClick={() => onDecide("aprobado", note)}>
            ✓ {tr("Dar visto bueno")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <dl className={cx(subPanelClass, "space-y-1.5 p-3")}>
          <div className="flex justify-between gap-3">
            <dt className="text-(color:--tf-94A3B8-niebla)">{tr("Realizado por")}</dt>
            <dd className="text-right font-bold text-(color:--tf-white)">
              {item.author} · {item.requestedAt}
            </dd>
          </div>
          <div className="border-t border-(color:--tf-B87333-cobre)/20 pt-1.5">
            <dt className="mb-0.5 text-(color:--tf-94A3B8-niebla)">{tr("Trabajo a revisar")}</dt>
            <dd className="whitespace-pre-line text-(color:--tf-C0C0C0-plata)">{tr(item.kind === "tarea" ? `${item.task?.title ?? ""} — ${item.task?.description ?? ""}` : item.summary)}</dd>
          </div>
          {item.history.length > 0 && (
            <div className="border-t border-(color:--tf-B87333-cobre)/20 pt-1.5">
              <dt className="mb-0.5 text-(color:--tf-94A3B8-niebla)">{tr("Historial de la revisión")}</dt>
              {item.history.map((h, i) => (
                <dd key={i} className="text-[11px] text-(color:--tf-C0C0C0-plata)">
                  {h.at} · {h.by} {tr(REVIEW_ACTIONS[h.action])}
                  {h.note ? ` — “${h.note}”` : ""}
                </dd>
              ))}
            </div>
          )}
        </dl>
        <label className="block">
          <span className={labelClass}>{tr("Comentario (obligatorio para pedir cambios)")}</span>
          <textarea
            data-autofocus
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(false);
            }}
            placeholder={tr("Ej: Revisado conforme. / Falta documentar el plan de rollback.")}
            className={cx(inputClass, error && "border-(color:--tf-red-500)")}
          />
          {error && <span className="mt-1 block text-[11px] text-(color:--tf-red-300)">{tr("Explica qué hay que cambiar para que {name} pueda corregirlo.", { name: item.author })}</span>}
        </label>
        <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("La firma queda registrada a nombre de {name} con fecha y hora.", { name: me })}</p>
      </div>
    </Modal>
  );
}

const STAGE_COLORS: Record<number, string> = {
  1: "bg-(color:--tf-64748B)",
  2: "bg-(color:--tf-B87333-cobre)",
  3: "bg-(color:--tf-22D3EE-cian)",
  4: "bg-(color:--tf-E5A93C-laton)",
  5: "bg-(color:--tf-22C55E-fosforo)",
};

function StageMatrix({ client, onOpenQueue }: { client: ClientRecord; onOpenQueue: (clientName: string) => void }) {
  const { me } = useSession();
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STAGES_CONFIG.map((s) => {
        const v = client.stageValidations.find((x) => x.stageId === s.id);
        if (!v)
          return (
            <span key={s.id} className="rounded border border-(color:--tf-333333) px-1.5 py-0.5 font-mono text-[10px] text-(color:--tf-555555)">
              {s.sigla}:—
            </span>
          );
        if (v.status === "aprobado")
          return (
            <span key={s.id} className="rounded border border-(color:--tf-22C55E-fosforo)/50 bg-(color:--tf-22C55E-fosforo)/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-(color:--tf-22C55E-fosforo)">
              {s.sigla}:✓
            </span>
          );
        const forMe = v.author !== me && v.status === "pendiente";
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpenQueue(client.name)}
            title={tr("{stage}: pendiente de {name}", { stage: tr(s.name), name: partnerOf(v.author) })}
            className={cx(
              "rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold pointer-coarse:min-h-8",
              v.status === "cambios"
                ? "border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/50 text-(color:--tf-red-400)"
                : forMe
                ? "border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/25 text-(color:--tf-E5A93C-laton)"
                : "border-(color:--tf-B87333-cobre)/50 bg-(color:--tf-black)/60 text-(color:--tf-94A3B8-niebla)"
            )}
          >
            {s.sigla}:{v.status === "cambios" ? "↺" : "⏳"}
          </button>
        );
      })}
    </div>
  );
}

function Census({ clients, onOpenQueue }: { clients: ClientRecord[]; onOpenQueue: (clientName: string) => void }) {
  const [stage, setStage] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const total = clients.length;
  const list = clients.filter((c) => (stage === null || c.currentStage === stage) && matchesQuery(query, c.name, c.id, c.industry, c.contactName));

  return (
    <>
      <section className={cx(panelClass, "space-y-2.5 p-3 sm:p-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("Distribución del pipeline ({n} clientes activos)", { n: total })}</span>
          <span className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Toca una etapa para filtrar el censo")}</span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-lg border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/60">
          {STAGES_CONFIG.map((s) => {
            const count = clients.filter((c) => c.currentStage === s.id).length;
            if (!count) return null;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`${tr(s.name)}: ${count}`}
                title={`${tr(s.name)}: ${count}`}
                style={{ width: `${(count / total) * 100}%` }}
                className={cx(STAGE_COLORS[s.id], "h-full hover:brightness-125")}
                onClick={() => setStage(stage === s.id ? null : s.id)}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STAGES_CONFIG.map((s) => {
            const count = clients.filter((c) => c.currentStage === s.id).length;
            return (
              <Chip key={s.id} active={stage === s.id} tone="laton" onClick={() => setStage(stage === s.id ? null : s.id)}>
                <span className={cx("h-2 w-2 rounded-full", STAGE_COLORS[s.id])} />
                {s.sigla} {tr(s.shortName)}: <strong>{count}</strong>
                <span className="opacity-70">({total ? Math.round((count / total) * 100) : 0}%)</span>
              </Chip>
            );
          })}
        </div>
      </section>

      <section className={cx(panelClass, "space-y-3 bg-(color:--tf-0B0D16) p-3 sm:p-4")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-(color:--tf-white)">
            {tr("Censo de clientes ({n} de {total})", { n: list.length, total })}
            {stage !== null && <span className="ml-2 text-(color:--tf-E5A93C-laton)">· {tr(getStage(stage).name)}</span>}
          </span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Filtrar por nombre o ID...")} className={cx(inputClass, "sm:w-64")} />
        </div>

        {list.length === 0 ? (
          <EmptyState>{tr("No se encontraron clientes para los filtros seleccionados.")}</EmptyState>
        ) : (
          <>
            <ul className="space-y-2 md:hidden">
              {list.map((c) => (
                <li key={c.id} className={cx(subPanelClass, "space-y-2 p-3")}>
                  <button type="button" onClick={() => navigate("boveda", c.id)} className="block w-full text-left">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-(color:--tf-white)">{tr(c.name)}</span>
                      <Badge tone="laton">{c.id}</Badge>
                    </span>
                    <span className="block text-[11px] text-(color:--tf-94A3B8-niebla)">
                      [{getStage(c.currentStage).sigla}] {tr(getStage(c.currentStage).name)} · {tr(c.plan)}
                    </span>
                  </button>
                  <StageMatrix client={c} onOpenQueue={onOpenQueue} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs text-(color:--tf-C0C0C0-plata)">
                <thead>
                  <tr className="border-b border-(color:--tf-B87333-cobre)/30 text-[10px] uppercase tracking-wider text-(color:--tf-E5A93C-laton)">
                    <th className="px-3 py-2">{tr("Cliente / ID")}</th>
                    <th className="px-3 py-2">{tr("Sector")}</th>
                    <th className="px-3 py-2">{tr("Etapa actual")}</th>
                    <th className="px-3 py-2">{tr("Validaciones (L · P · D · MB · P)")}</th>
                    <th className="px-3 py-2">{tr("Contacto")}</th>
                    <th className="px-3 py-2 text-right">{tr("Plan / SLA")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(color:--tf-B87333-cobre)/15">
                  {list.map((c) => {
                    const s = getStage(c.currentStage);
                    return (
                      <tr key={c.id} className="cursor-pointer transition-colors hover:bg-(color:--tf-121626)" onClick={() => navigate("boveda", c.id)}>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-(color:--tf-white)">{tr(c.name)}</div>
                          <div className="font-mono text-[10px] text-(color:--tf-E5A93C-laton)">{c.id}</div>
                        </td>
                        <td className="px-3 py-2.5 text-(color:--tf-94A3B8-niebla)">{tr(c.industry)}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={c.currentStage === 5 ? "fosforo" : c.currentStage === 4 ? "laton" : "muted"}>
                            [{s.sigla}] {tr(s.name)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <StageMatrix client={c} onOpenQueue={onOpenQueue} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-[11px] text-(color:--tf-white)">{tr(c.contactName)}</div>
                          <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">{c.contactEmail}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="text-[11px] font-bold text-(color:--tf-22C55E-fosforo)">{tr(c.plan)}</div>
                          <div className="font-mono text-[10px] text-(color:--tf-94A3B8-niebla)">
                            {tr(getPlan(c.plan).disponibilidad)} · P1 {tr(getPlan(c.plan).respuesta.P1)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
