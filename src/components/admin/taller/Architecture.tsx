"use client";

import { FormEvent, useState } from "react";
import { tr } from "@/i18n/translate";
import { Adr, AdrStatus, adrsStore, nextAdrId, useAdrs } from "../data/tasks";
import { todayStamp } from "../data/time";
import { useSession } from "../session";
import { useFeedback } from "../ui/feedback";
import { Modal } from "../ui/Modal";
import { Badge, Button, EmptyState, Field, IconButton, SectionTitle, cx, inputClass, panelClass } from "../ui/kit";

const ADR_STATUSES: AdrStatus[] = ["Propuesto", "Aprobado", "Reemplazado", "Rechazado"];
const ADR_TONES: Record<AdrStatus, "fosforo" | "laton" | "muted" | "danger"> = {
  Propuesto: "laton",
  Aprobado: "fosforo",
  Reemplazado: "muted",
  Rechazado: "danger",
};

export function Architecture() {
  const adrs = useAdrs();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState<Adr | "new" | null>(null);

  async function remove(adr: Adr) {
    const ok = await confirm({
      title: tr("¿Eliminar {id}?", { id: adr.id }),
      message: tr("Si la decisión cambió, es mejor marcarla como Reemplazada para conservar el registro."),
      confirmLabel: tr("Eliminar"),
      tone: "danger",
    });
    if (!ok) return;
    adrsStore.set((list) => list.filter((a) => a.id !== adr.id));
    toast(tr("{id} eliminado", { id: adr.id }));
  }

  return (
    <div className="space-y-4">
      <section className={cx(panelClass, "space-y-4 border-2 border-(color:--tf-22C55E-fosforo)/40 p-4 sm:p-5")}>
        <SectionTitle aside={<span className="text-[10px] text-(color:--tf-94A3B8-niebla)">{tr("DISEÑO ZERO-SPOF")}</span>}>
          {tr("Topología de sistema de dos cabezas (Active-Active)")}
        </SectionTitle>
        <div className="grid grid-cols-1 gap-4 text-center text-xs md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-0C101C) p-4">
            <div className="text-[10px] font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("CAPA DE INGRESO")}</div>
            <div className="my-2 text-sm font-bold text-(color:--tf-white)">{tr("Edge Network Global")}</div>
            <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Anycast DNS • Enrutamiento por proximidad geográfica")}</div>
          </div>
          <div className="flex flex-col justify-between rounded-lg border-2 border-(color:--tf-22C55E-fosforo) bg-(color:--tf-0D161A) p-4">
            <div className="text-[10px] font-bold uppercase text-(color:--tf-22C55E-fosforo)">{tr("NÚCLEO BICÉFALO ACTIVE-ACTIVE")}</div>
            <div className="my-2 space-y-1">
              <div className="text-sm font-bold text-(color:--tf-white)">{tr("Cabezal 01: Producto & Frontend (FT)")}</div>
              <div className="font-mono text-xs text-(color:--tf-22C55E-fosforo)">{tr("↕ Sincronía Criptográfica mTLS ↕")}</div>
              <div className="text-sm font-bold text-(color:--tf-white)">{tr("Cabezal 02: Backend & Seguridad (JPH)")}</div>
            </div>
            <div className="font-mono text-[10px] text-(color:--tf-22C55E-fosforo)">{tr("FIPS 140-3 Hardware Enclave")}</div>
          </div>
          <div className="flex flex-col justify-between rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-0C101C) p-4">
            <div className="text-[10px] font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("ALMACÉN DE SECRETOS")}</div>
            <div className="my-2 text-sm font-bold text-(color:--tf-white)">{tr("Bóveda Criptográfica")}</div>
            <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("AES-256-GCM • Cifrado en Reposo • Auditoría Inmutable")}</div>
          </div>
        </div>
      </section>

      <section className={cx(panelClass, "space-y-3 p-4 sm:p-5")}>
        <SectionTitle
          aside={
            <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
              + {tr("Nuevo ADR")}
            </Button>
          }
        >
          {tr("Registro de decisiones de arquitectura (ADRs)")}
        </SectionTitle>
        {adrs.length === 0 && <EmptyState>{tr("Aún no hay decisiones registradas.")}</EmptyState>}
        {adrs.map((adr) => (
          <article key={adr.id} className="space-y-1.5 rounded-lg border border-(color:--tf-B87333-cobre)/25 bg-(color:--tf-0F121D) p-3.5 text-xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="font-bold text-(color:--tf-white)">
                {adr.id}: {tr(adr.title)}
              </h4>
              <div className="flex items-center gap-1">
                <Badge tone={ADR_TONES[adr.status]}>{tr(adr.status).toUpperCase()}</Badge>
                <IconButton label={tr("Editar ADR")} onClick={() => setEditing(adr)}>
                  ✏️
                </IconButton>
                <IconButton label={tr("Eliminar ADR")} tone="danger" onClick={() => remove(adr)}>
                  🗑
                </IconButton>
              </div>
            </div>
            <div className="text-[10px] text-(color:--tf-64748B)">
              {adr.author} · {adr.date}
            </div>
            {adr.context && (
              <p className="text-(color:--tf-94A3B8-niebla)">
                <strong className="text-(color:--tf-C0C0C0-plata)">{tr("Contexto:")}</strong> {tr(adr.context)}
              </p>
            )}
            <p className="leading-relaxed text-(color:--tf-94A3B8-niebla)">
              <strong className="text-(color:--tf-C0C0C0-plata)">{tr("Decisión:")}</strong> {tr(adr.decision)}
            </p>
          </article>
        ))}
      </section>

      {editing && <AdrModal adr={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AdrModal({ adr, onClose }: { adr?: Adr; onClose: () => void }) {
  const { me } = useSession();
  const { toast } = useFeedback();
  const adrs = useAdrs();
  const [title, setTitle] = useState(adr?.title ?? "");
  const [context, setContext] = useState(adr?.context ?? "");
  const [decision, setDecision] = useState(adr?.decision ?? "");
  const [status, setStatus] = useState<AdrStatus>(adr?.status ?? "Propuesto");
  const formId = adr ? `adr-${adr.id}` : "adr-new";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !decision.trim()) return;
    if (adr) {
      adrsStore.set((list) => list.map((a) => (a.id === adr.id ? { ...a, title: title.trim(), context: context.trim(), decision: decision.trim(), status } : a)));
      toast(tr("{id} actualizado", { id: adr.id }));
    } else {
      const created: Adr = { id: nextAdrId(adrs), title: title.trim(), context: context.trim(), decision: decision.trim(), status, date: todayStamp(), author: me };
      adrsStore.set((list) => [...list, created]);
      toast(tr("{id} registrado", { id: created.id }));
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      size="lg"
      icon="🏛"
      title={adr ? tr("Editar {id}", { id: adr.id }) : tr("Nueva decisión de arquitectura")}
      subtitle={adr ? `${adr.author} · ${adr.date}` : tr("Consecutivo asignado: {id}", { id: nextAdrId(adrs) })}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant="brass">
            {tr("Guardar")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-3">
        <Field label={tr("Título *")}>
          <input data-autofocus required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>
        <Field label={tr("Estado")}>
          <select value={status} onChange={(e) => setStatus(e.target.value as AdrStatus)} className={inputClass}>
            {ADR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tr(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Contexto")} hint={tr("¿Qué problema o fuerza motiva la decisión?")}>
          <textarea rows={3} value={context} onChange={(e) => setContext(e.target.value)} className={inputClass} />
        </Field>
        <Field label={tr("Decisión *")}>
          <textarea rows={4} required value={decision} onChange={(e) => setDecision(e.target.value)} className={inputClass} />
        </Field>
      </form>
    </Modal>
  );
}
