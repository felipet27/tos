"use client";

import { FormEvent, useState } from "react";
import { tr } from "@/i18n/translate";
import {
  ClientRecord,
  ClientStatus,
  activity,
  addClient,
  generateClientToken,
  getNextClientId,
  sanitizeClient,
  updateClient,
} from "../data/clients";
import { OperatorName } from "../data/operators";
import { OPERATION_PLANS, OperationPlan, getPlan, planPriceLabel } from "../data/plans";
import { todayStamp } from "../data/time";
import { Modal } from "../ui/Modal";
import { Button, Field, cx, inputClass } from "../ui/kit";

const STATUSES: ClientStatus[] = ["Activo", "En Implementación", "Piloto", "En Pausa"];

interface FormState {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  plan: OperationPlan;
  nodesAssigned: number;
  status: ClientStatus;
  token2FA: string;
  notes: string;
}

// Create a client (mode "create") or edit the record of an existing one
export function ClientFormModal({
  mode,
  client,
  clients,
  me,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  client?: ClientRecord;
  clients: ClientRecord[];
  me: OperatorName;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    client
      ? {
          id: client.id,
          name: client.name,
          industry: client.industry,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
          plan: client.plan,
          nodesAssigned: client.nodesAssigned,
          status: client.status,
          token2FA: client.token2FA,
          notes: client.notes,
        }
      : {
          id: getNextClientId(clients),
          name: "",
          industry: "",
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          plan: "Profesional",
          nodesAssigned: getPlan("Profesional").defaultNodes,
          status: "Activo",
          token2FA: "",
          notes: "",
        }
  );
  const [error, setError] = useState<string | null>(null);
  const formId = `client-form-${mode}`;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function selectPlan(plan: OperationPlan) {
    setForm((prev) => ({ ...prev, plan, nodesAssigned: getPlan(plan).defaultNodes }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || !form.industry.trim()) {
      setError(tr("El nombre y el sector son obligatorios."));
      return;
    }
    const nodes = Math.min(16, Math.max(1, Math.round(form.nodesAssigned) || 1));

    if (mode === "create") {
      const id = form.id.trim().toUpperCase();
      if (!/^FF-\d{3,}$/.test(id)) {
        setError(tr("El ID debe tener el formato FF-007."));
        return;
      }
      if (clients.some((c) => c.id === id)) {
        setError(tr("Ya existe un cliente con el ID {id}. Usa el siguiente consecutivo: {next}.", { id, next: getNextClientId(clients) }));
        return;
      }
      const created = sanitizeClient(
        {
          id,
          name,
          industry: form.industry.trim(),
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          plan: form.plan,
          status: form.status,
          nodesAssigned: nodes,
          createdAt: todayStamp(),
          notes: form.notes.trim(),
          token2FA: generateClientToken(name),
          currentStage: 1,
          createdBy: me,
          stageValidations: [],
          activity: [],
        },
        clients.length
      );
      // The first stage starts pending for the partner, summarised by the creator
      created.stageValidations = created.stageValidations.map((v) => ({ ...v, activitySummary: "Alta del cliente y levantamiento inicial" }));
      addClient(created);
      onSaved(id);
      return;
    }

    if (!client) return;
    const changed: string[] = [];
    if (name !== client.name) changed.push("nombre");
    if (form.industry.trim() !== client.industry) changed.push("sector");
    if (form.contactName.trim() !== client.contactName || form.contactEmail.trim() !== client.contactEmail || form.contactPhone.trim() !== client.contactPhone) changed.push("contacto");
    if (form.status !== client.status) changed.push("estado");
    if (nodes !== client.nodesAssigned) changed.push("nodos");
    if (form.token2FA.trim() !== client.token2FA) changed.push("token 2FA");
    if (form.notes.trim() !== client.notes) changed.push("notas");

    const planChanged = form.plan !== client.plan;
    updateClient(
      client.id,
      (c) => ({
        ...c,
        name,
        industry: form.industry.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        plan: form.plan,
        sla: `${getPlan(form.plan).disponibilidad} · P1 ${getPlan(form.plan).respuesta.P1}`,
        status: form.status,
        nodesAssigned: nodes,
        token2FA: form.token2FA.trim() || c.token2FA,
        notes: form.notes.trim(),
        activity: [
          ...(planChanged ? [activity(me, "Plan cambiado de {from} a {to}", { from: client.plan, to: form.plan })] : []),
          ...(changed.length ? [activity(me, "Ficha actualizada: {fields}", { fields: changed.join(", ") })] : []),
          ...c.activity,
        ],
      })
    );
    onSaved(client.id);
  }

  const plan = getPlan(form.plan);

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      size="lg"
      tone={mode === "create" ? "fosforo" : "laton"}
      icon={mode === "create" ? "+" : "✏️"}
      title={mode === "create" ? tr("Anexar nuevo cliente a la Bóveda") : tr("Modificar expediente del cliente")}
      subtitle={mode === "edit" && client ? `${client.id} · ${client.name}` : tr("El ID se asigna con el siguiente consecutivo disponible.")}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant={mode === "create" ? "primary" : "brass"}>
            {mode === "create" ? tr("Registrar en Bóveda") : tr("Guardar modificaciones")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-3.5">
        {error && (
          <p role="alert" className="rounded-lg border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/40 p-2.5 text-(color:--tf-red-300)">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mode === "create" && (
            <Field label={tr("ID del cliente *")} hint={tr("Consecutivo sugerido: {next}", { next: getNextClientId(clients) })} className="sm:col-span-2">
              <input
                required
                value={form.id}
                onChange={(e) => set("id", e.target.value.toUpperCase())}
                className={cx(inputClass, "font-mono font-bold tracking-wider")}
              />
            </Field>
          )}
          <Field label={tr("Razón social / Nombre de empresa *")} className="sm:col-span-2">
            <input data-autofocus required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={tr("Ej: Inmobiliaria Medellin S.A.S.")} className={inputClass} />
          </Field>
          <Field label={tr("Sector o industria *")}>
            <input required value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder={tr("Ej: Bienes Raíces & PropTech")} className={inputClass} />
          </Field>
          <Field label={tr("Estado del cliente")}>
            <select value={form.status} onChange={(e) => set("status", e.target.value as ClientStatus)} className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tr(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Contacto oficial (nombre y cargo)")}>
            <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder={tr("Ej: Andrés Restrepo (Gerente)")} className={inputClass} />
          </Field>
          <Field label={tr("Correo electrónico")}>
            <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="contacto@cliente.com" className={inputClass} />
          </Field>
          <Field label={tr("Teléfono / WhatsApp")}>
            <input type="tel" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+57 300 000 0000" className={inputClass} />
          </Field>
          <Field label={tr("Nodos asignados")} hint={tr("Incluidos en el plan: {n}", { n: plan.defaultNodes })}>
            <input type="number" min={1} max={16} value={form.nodesAssigned} onChange={(e) => set("nodesAssigned", Number(e.target.value))} className={inputClass} />
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-(color:--tf-E5A93C-laton)">{tr("Plan de operación *")}</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr("Plan de operación")}>
            {OPERATION_PLANS.map((p) => {
              const selected = form.plan === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectPlan(p.name)}
                  className={cx(
                    "rounded-lg border p-2.5 text-left transition-all pointer-coarse:min-h-12",
                    selected
                      ? "border-(color:--tf-E5A93C-laton) bg-(color:--tf-E5A93C-laton)/15 ring-1 ring-(color:--tf-E5A93C-laton)"
                      : "border-(color:--tf-B87333-cobre)/35 bg-(color:--tf-black)/40 hover:border-(color:--tf-B87333-cobre)/70"
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-(color:--tf-white)">
                    {tr(p.name)} <span className="font-mono text-(color:--tf-E5A93C-laton)">{planPriceLabel(p)}</span>
                  </div>
                  <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">
                    {tr(p.disponibilidad)} · P1 {tr(p.respuesta.P1)}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("El SLA contractual sale del plan: no se edita a mano para que coincida con Handshake.")}</p>
        </div>

        {mode === "edit" && (
          <Field label={tr("Token 2FA")}>
            <div className="flex gap-2">
              <input value={form.token2FA} onChange={(e) => set("token2FA", e.target.value)} className={cx(inputClass, "font-mono text-(color:--tf-22C55E-fosforo)")} />
              <Button onClick={() => set("token2FA", generateClientToken(form.name))}>🔄 {tr("Regenerar")}</Button>
            </div>
          </Field>
        )}

        <Field label={tr("Notas base, alcance y especificaciones técnicas")}>
          <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder={tr("Notas de contexto, requerimientos específicos de infraestructura, etc.")} className={inputClass} />
        </Field>
      </form>
    </Modal>
  );
}
