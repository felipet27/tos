"use client";

import { useMemo, useState } from "react";
import { tr, trv } from "@/i18n/translate";
import { ClientRecord, TimelineTone, activity, buildTimeline, deleteClient, deleteStoredFile, updateClient } from "../data/clients";
import { OperatorName } from "../data/operators";
import { SERVICE_LEVEL_ROWS, getPlan } from "../data/plans";
import { nowStamp } from "../data/time";
import { navigate } from "../nav";
import { useFeedback } from "../ui/feedback";
import { Badge, Button, SectionTitle, cx, panelClass, subPanelClass } from "../ui/kit";
import { AuthorDot } from "./shared";

const TONE_DOT: Record<TimelineTone, string> = {
  stage: "bg-(color:--tf-E5A93C-laton)",
  approved: "bg-(color:--tf-22C55E-fosforo)",
  changes: "bg-(color:--tf-red-400)",
  note: "bg-(color:--tf-22D3EE-cian)",
  file: "bg-(color:--tf-22D3EE-cian)",
  prod: "bg-(color:--tf-22C55E-fosforo)",
  edit: "bg-(color:--tf-94A3B8-niebla)",
  danger: "bg-(color:--tf-red-500)",
};

export function ClientFicha({ client, me, onEdit }: { client: ClientRecord; me: OperatorName; onEdit: () => void }) {
  const { confirm, toast } = useFeedback();
  const [copied, setCopied] = useState(false);
  const plan = getPlan(client.plan);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(client.token2FA);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(tr("No se pudo copiar al portapapeles"), "warn");
    }
  }

  async function toggleArchive() {
    if (!client.archived) {
      const ok = await confirm({
        title: tr("¿Archivar {client}?", { client: client.name }),
        message: tr("Deja de aparecer en Bóveda, Observatorio y los contadores. Puedes restaurarlo cuando quieras desde \"Archivados\"."),
        confirmLabel: tr("Archivar"),
      });
      if (!ok) return;
    }
    const archived = !client.archived;
    updateClient(
      client.id,
      (c) => ({ ...c, archived, archivedAt: archived ? nowStamp() : undefined }),
      activity(me, archived ? "Cliente archivado" : "Cliente restaurado del archivo")
    );
    toast(archived ? tr("{client} archivado", { client: client.name }) : tr("{client} restaurado", { client: client.name }));
  }

  async function remove() {
    const files = Object.values(client.propuesta.slots).flatMap((s) => (s.file ? [s.file] : []));
    const ok = await confirm({
      title: tr("¿Eliminar definitivamente {client}?", { client: client.name }),
      message: (
        <>
          {tr("Se borra el expediente completo: notas, validaciones, repositorios, escritos y bitácora.")}
          {files.length > 0 && <> {tr("También se eliminarán {n} archivo(s) almacenados.", { n: files.length })}</>}{" "}
          <strong>{tr("Esta acción no se puede deshacer.")}</strong> {tr("Si solo quieres ocultarlo, archívalo.")}
        </>
      ),
      confirmLabel: tr("Eliminar cliente"),
      tone: "danger",
    });
    if (!ok) return;
    await Promise.all(files.map(deleteStoredFile));
    deleteClient(client.id);
    navigate("boveda", undefined, undefined, { replace: true });
    toast(tr("{client} eliminado", { client: client.name }));
  }

  return (
    <section className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(color:--tf-B87333-cobre)/20 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">
          {tr("FICHA DEL CLIENTE")} <Badge>{client.id}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="warn" onClick={onEdit}>
            ✏️ {tr("Modificar")}
          </Button>
          <Button size="sm" onClick={toggleArchive}>
            {client.archived ? tr("↺ Restaurar") : tr("🗄 Archivar")}
          </Button>
          <Button size="sm" variant="danger" onClick={remove}>
            🗑 {tr("Eliminar")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 text-xs md:grid-cols-4">
        <div className={cx(subPanelClass, "p-2.5")}>
          <span className="block text-[10px] font-semibold uppercase text-(color:--tf-E5A93C-laton)">{tr("Contacto Oficial")}</span>
          <span className="font-bold text-(color:--tf-white)">{tr(client.contactName) || "—"}</span>
          <div className="break-all text-[11px] text-(color:--tf-94A3B8-niebla)">
            {client.contactEmail && <a href={`mailto:${client.contactEmail}`} className="hover:underline">{client.contactEmail}</a>}
            {client.contactEmail && client.contactPhone && " • "}
            {client.contactPhone && <a href={`tel:${client.contactPhone.replace(/\s+/g, "")}`} className="hover:underline">{client.contactPhone}</a>}
          </div>
        </div>
        <div className={cx(subPanelClass, "p-2.5")}>
          <span className="block text-[10px] font-semibold uppercase text-(color:--tf-E5A93C-laton)">{tr("Plan & SLA Contractual")}</span>
          <span className="font-bold text-(color:--tf-white)">{tr(plan.name)}</span>
          <div className="text-[11px] font-semibold text-(color:--tf-22C55E-fosforo)">{tr(plan.disponibilidad)} · P1 {tr(plan.respuesta.P1)}</div>
        </div>
        <div className={cx(subPanelClass, "p-2.5")}>
          <span className="block text-[10px] font-semibold uppercase text-(color:--tf-E5A93C-laton)">{tr("Nodos e Infraestructura")}</span>
          <span className="font-bold text-(color:--tf-white)">{tr("{n} nodo(s)", { n: client.nodesAssigned })}</span>
          <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr(plan.infraestructura)}</div>
        </div>
        <div className={cx(subPanelClass, "p-2.5")}>
          <span className="block text-[10px] font-semibold uppercase text-(color:--tf-E5A93C-laton)">{tr("Token 2FA")}</span>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono font-bold text-(color:--tf-22C55E-fosforo)">{client.token2FA || "—"}</span>
            {client.token2FA && (
              <Button size="xs" onClick={copyToken}>
                {copied ? tr("✓ Copiado") : tr("Copiar")}
              </Button>
            )}
          </div>
          <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Estado:")} {tr(client.status)}</div>
        </div>
      </div>

      <div className={cx(subPanelClass, "space-y-2 p-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(color:--tf-B87333-cobre)/20 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">
          <span>
            ⚙ {tr("Niveles de servicio del plan")} <span className="text-(color:--tf-white)">{tr(plan.name)}</span>
          </span>
          <button type="button" onClick={() => navigate("handshake", "sla", client.id)} className="font-mono text-[10px] font-bold text-(color:--tf-E5A93C-laton) hover:underline pointer-coarse:min-h-10">
            {tr("Ver matriz en Handshake ➔")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 lg:grid-cols-8">
          {SERVICE_LEVEL_ROWS.map((row) => (
            <div key={row.key} className="rounded border border-(color:--tf-B87333-cobre)/15 bg-(color:--tf-141624)/70 p-2">
              <span className="block text-[9px] font-semibold uppercase text-(color:--tf-94A3B8-niebla)">{tr(row.param)}</span>
              <span className="mt-0.5 block font-medium leading-snug text-(color:--tf-white)">{tr(String(plan[row.key]))}</span>
            </div>
          ))}
        </div>
      </div>

      {client.notes && (
        <p className={cx(subPanelClass, "p-2.5 text-xs text-(color:--tf-C0C0C0-plata)")}>
          <span className="mr-1.5 text-[10px] font-semibold uppercase text-(color:--tf-E5A93C-laton)">{tr("Notas / Alcance:")}</span>
          {tr(client.notes)}
        </p>
      )}

      <ClientTimeline client={client} />
    </section>
  );
}

const PAGE = 8;

export function ClientTimeline({ client }: { client: ClientRecord }) {
  const events = useMemo(() => buildTimeline(client), [client]);
  const [limit, setLimit] = useState(PAGE);

  return (
    <div className="space-y-2">
      <SectionTitle aside={<span className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("{n} eventos", { n: events.length })}</span>}>
        {tr("Línea de tiempo del cliente")}
      </SectionTitle>
      <ol className="relative space-y-3 border-l border-(color:--tf-B87333-cobre)/30 pl-4">
        {events.slice(0, limit).map((e) => (
          <li key={e.id} className="relative">
            <span className={cx("absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-(color:--tf-07090F-panel)", TONE_DOT[e.tone])} aria-hidden />
            <div className="flex flex-wrap items-center gap-x-2 text-[11px]">
              <span className="font-mono text-(color:--tf-64748B)">{e.at}</span>
              <span className="flex items-center gap-1 font-bold text-(color:--tf-white)">
                <AuthorDot name={e.by} /> {e.by}
              </span>
            </div>
            <div className="text-xs text-(color:--tf-C0C0C0-plata)">{trv(e.action, e.vars)}</div>
            {e.detail && <p className="mt-0.5 line-clamp-2 text-[11px] italic text-(color:--tf-94A3B8-niebla)">“{tr(e.detail)}”</p>}
          </li>
        ))}
      </ol>
      {events.length > limit && (
        <Button size="sm" onClick={() => setLimit(limit + PAGE * 2)}>
          {tr("Ver más ({n} restantes)", { n: events.length - limit })}
        </Button>
      )}
    </div>
  );
}
