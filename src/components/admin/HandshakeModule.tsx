"use client";

import { ReactNode, useMemo, useState } from "react";
import { tr, dateLocale } from "@/i18n/translate";
import { activity, updateClient, useClients } from "./data/clients";
import {
  EXTRA_NODE_PRICE_USD,
  OPERATION_PLANS,
  OperationPlan,
  PlanInfo,
  SERVICE_LEVEL_ROWS,
  SEVERITIES,
  clampInt,
  formatUsd,
  getPlan,
  planPriceLabel,
  planSlaLabel,
  proposalMonthlyTotal,
} from "./data/plans";
import { takeProposalRef, useNextProposalRef } from "./data/proposals";
import { nowStamp } from "./data/time";
import { navigate } from "./nav";
import { useSession } from "./session";
import { useFeedback } from "./ui/feedback";
import { Badge, Button, Chip, Field, ModuleHeader, SectionTitle, cx, inputClass, panelClass, subPanelClass } from "./ui/kit";

type Tab = "planes" | "sla" | "clausulas" | "propuesta" | "programas";

const TABS: { id: Tab; number: string; title: string; subtitle: string }[] = [
  { id: "planes", number: "01", title: "Planes y tarifas", subtitle: "Esencial, Profesional y Crítico" },
  { id: "sla", number: "02", title: "Niveles de servicio", subtitle: "Matriz por plan y severidad P1-P4" },
  { id: "clausulas", number: "03", title: "Cláusulas contractuales", subtitle: "Texto para anexar a contratos" },
  { id: "propuesta", number: "04", title: "Plantilla de propuesta", subtitle: "Configurador, PDF y expediente" },
  { id: "programas", number: "05", title: "Programas", subtitle: "Fundador, Idea y Retorno de Inversión" },
];

function isTab(value?: string): value is Tab {
  return TABS.some((t) => t.id === value);
}

export function HandshakeModule({ tab, clientId }: { tab?: string; clientId?: string }) {
  const active: Tab = isTab(tab) ? tab : "planes";

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        accent="laton"
        title={tr("HANDSHAKE // GESTIÓN COMERCIAL, CONTRATOS & ALIANZAS")}
        subtitle={tr("Planes, niveles de servicio, cláusulas y propuestas: todo sale de la misma tabla de planes.")}
      />

      <nav className="-mx-1 grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-2 overflow-x-auto px-1 pb-1 no-scrollbar lg:grid-flow-row lg:grid-cols-5" aria-label={tr("Secciones de Handshake")}>
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => navigate("handshake", t.id, t.id === "sla" || t.id === "propuesta" ? clientId : undefined)}
              className={cx(
                "rounded-xl border p-3 text-left transition-all pointer-coarse:min-h-14",
                isActive
                  ? "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/15 ring-1 ring-(color:--tf-22C55E-fosforo)"
                  : "border-(color:--tf-B87333-cobre)/35 bg-(color:--tf-07090F-panel) hover:border-(color:--tf-E5A93C-laton)/70"
              )}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-(color:--tf-E5A93C-laton)">[{t.number}]</span>
                {isActive && <span className="text-(color:--tf-22C55E-fosforo)">●</span>}
              </div>
              <div className={cx("mt-1 text-xs font-bold", isActive ? "text-(color:--tf-white)" : "text-(color:--tf-C0C0C0-plata)")}>{tr(t.title)}</div>
              <div className="mt-0.5 text-[10px] text-(color:--tf-94A3B8-niebla)">{tr(t.subtitle)}</div>
            </button>
          );
        })}
      </nav>

      {active === "planes" && <PlansTab />}
      {active === "sla" && <SlaTab clientId={clientId} />}
      {active === "clausulas" && <ClausesTab />}
      {active === "propuesta" && <ProposalTab key={clientId ?? "none"} clientId={clientId} />}
      {active === "programas" && <ProgramsTab />}
    </div>
  );
}

// ------------------------------------------------------------------ 01 · plans

function planFeatures(plan: PlanInfo): string[] {
  return [
    `${tr(plan.nodesLabel)} (${tr(plan.infraestructura)})`,
    tr("SLA {availability} · respuesta P1 {p1}", { availability: tr(plan.disponibilidad), p1: tr(plan.respuesta.P1) }),
    tr("Soporte {hours}", { hours: tr(plan.soporte) }),
    tr("RPO {rpo} · RTO {rto} · backups {backups}", { rpo: tr(plan.rpo), rto: tr(plan.rto), backups: tr(plan.retencionBackups) }),
    tr("Bolsa de mejoras: {hours}", { hours: tr(plan.bolsaMejoras) }),
    tr("Seguimiento de métricas: {freq}", { freq: tr(plan.seguimientoMetricas) }),
    ...plan.extras.map((x) => tr(x)),
  ];
}

function PlansTab() {
  return (
    <div className="space-y-3">
      <SectionTitle aside={<span className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Facturación mensual, o anual con 15% de ahorro")}</span>}>
        {tr("Esquema tarifario vigente")}
      </SectionTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {OPERATION_PLANS.map((plan) => {
          const featured = plan.name === "Profesional";
          return (
            <article
              key={plan.id}
              className={cx(
                "relative flex flex-col justify-between rounded-xl p-5",
                featured ? "border-2 border-(color:--tf-22C55E-fosforo) bg-(color:--tf-0C121D)" : "border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07090F-panel)"
              )}
            >
              {featured && (
                <span className="absolute -top-3 right-4 rounded-full bg-(color:--tf-22C55E-fosforo) px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-(color:--tf-black)">
                  {tr("MÁS POPULAR")}
                </span>
              )}
              <div>
                <div className={cx("text-[11px] font-bold uppercase tracking-wider", featured ? "text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-E5A93C-laton)")}>{tr(plan.tagline)}</div>
                <h3 className="mt-1 text-lg font-bold text-(color:--tf-white)">{tr(plan.name)}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-(color:--tf-white)">{planPriceLabel(plan)}</span>
                  <span className="text-xs text-(color:--tf-94A3B8-niebla)">{tr("USD / mes")}</span>
                </div>
                <p className="mt-2 text-xs text-(color:--tf-94A3B8-niebla)">{tr(plan.description)}</p>
                <ul className="mt-4 space-y-2 text-xs text-(color:--tf-C0C0C0-plata)">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-(color:--tf-22C55E-fosforo)">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 border-t border-(color:--tf-B87333-cobre)/20 pt-3 text-[10px] text-(color:--tf-888888)">
                <div className="font-mono">
                  {tr("CÓDIGO:")} {plan.code}
                </div>
                <div>{tr("Nodo adicional: {price} USD/mes", { price: formatUsd(EXTRA_NODE_PRICE_USD) })}</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 02 · service levels

function SlaTab({ clientId }: { clientId?: string }) {
  const { me } = useSession();
  const { confirm, toast } = useFeedback();
  const clients = useClients();
  const active = clients.filter((c) => !c.archived);
  const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
  const [mobilePlan, setMobilePlan] = useState<OperationPlan>(client?.plan ?? "Profesional");
  const highlight = client?.plan;

  async function changePlan(plan: OperationPlan) {
    if (!client || client.plan === plan) return;
    const info = getPlan(plan);
    const ok = await confirm({
      title: tr("¿Cambiar el plan de {client} a {plan}?", { client: client.name, plan: tr(plan) }),
      message: tr("El SLA pasa a {sla} y los nodos asignados a {n}. El cambio queda en la línea de tiempo del cliente.", { sla: `${tr(info.disponibilidad)} · P1 ${tr(info.respuesta.P1)}`, n: info.defaultNodes }),
      confirmLabel: tr("Cambiar plan"),
    });
    if (!ok) return;
    updateClient(
      client.id,
      (c) => ({ ...c, plan, sla: planSlaLabel(plan), nodesAssigned: info.defaultNodes }),
      activity(me, "Plan cambiado de {from} a {to} desde Handshake", { from: client.plan, to: plan })
    );
    setMobilePlan(plan);
    toast(tr("Plan de {client} actualizado a {plan}", { client: client.name, plan: tr(plan) }));
  }

  const colClass = (plan: OperationPlan) => (highlight === plan ? "bg-(color:--tf-22C55E-fosforo)/15 font-bold text-(color:--tf-white)" : "");

  return (
    <div className="space-y-4">
      <section className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <SectionTitle aside={client ? <Badge tone="fosforo">{tr("CLIENTE VINCULADO:")} {client.id}</Badge> : null}>{tr("Contrastar con un cliente de la Bóveda")}</SectionTitle>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field label={tr("Cliente")}>
            <select value={client?.id ?? ""} onChange={(e) => navigate("handshake", "sla", e.target.value || undefined, { replace: true })} className={inputClass}>
              <option value="">{tr("— Sin cliente: ver la matriz estándar —")}</option>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.id}] {c.name} — {tr(c.plan)}
                </option>
              ))}
            </select>
          </Field>
          {client ? (
            <div className={cx(subPanelClass, "flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between")}>
              <div className="text-xs">
                <div className="font-bold text-(color:--tf-white)">{tr(client.name)}</div>
                <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">
                  {tr("Plan actual:")} <b className="text-(color:--tf-22C55E-fosforo)">{tr(client.plan)}</b> · {tr("Nodos:")} <b className="text-(color:--tf-white)">{client.nodesAssigned}</b>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {OPERATION_PLANS.map((p) => (
                  <Chip key={p.id} active={client.plan === p.name} onClick={() => changePlan(p.name)}>
                    {tr(p.name)}
                  </Chip>
                ))}
                <Button size="sm" variant="warn" onClick={() => navigate("boveda", client.id)}>
                  {tr("Expediente ➔")}
                </Button>
              </div>
            </div>
          ) : (
            <p className={cx(subPanelClass, "p-2.5 text-[11px] italic text-(color:--tf-94A3B8-niebla)")}>{tr("Al elegir un cliente su columna se resalta y puedes cambiarle el plan.")}</p>
          )}
        </div>
      </section>

      <section className={cx(panelClass, "space-y-3 p-3 sm:p-5")}>
        <SectionTitle>{tr("Niveles de servicio por plan (propuesto)")}</SectionTitle>

        {/* Phones: one plan at a time */}
        <div className="space-y-2 md:hidden">
          <div className="flex gap-1.5">
            {OPERATION_PLANS.map((p) => (
              <Chip key={p.id} active={mobilePlan === p.name} onClick={() => setMobilePlan(p.name)}>
                {tr(p.name)}
                {highlight === p.name && " ●"}
              </Chip>
            ))}
          </div>
          <dl className="divide-y divide-(color:--tf-B87333-cobre)/20 rounded-lg border border-(color:--tf-B87333-cobre)/30">
            {SERVICE_LEVEL_ROWS.map((row) => (
              <div key={row.key} className="flex justify-between gap-3 p-2.5 text-xs">
                <dt className="text-(color:--tf-94A3B8-niebla)">{tr(row.param)}</dt>
                <dd className="text-right font-semibold text-(color:--tf-white)">{tr(String(getPlan(mobilePlan)[row.key]))}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-(color:--tf-B87333-cobre)/30 md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-121626)/90">
                <th className="w-1/4 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("Métrica / Parámetro")}</th>
                {OPERATION_PLANS.map((p) => (
                  <th key={p.id} className={cx("w-1/4 px-4 py-3 text-center text-xs font-bold uppercase text-(color:--tf-white)", highlight === p.name && "bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo)")}>
                    {tr(p.name)}
                    {highlight === p.name && <span className="block text-[9px] font-bold normal-case text-(color:--tf-22C55E-fosforo)">{tr("plan del cliente")}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(color:--tf-B87333-cobre)/20 text-(color:--tf-C0C0C0-plata)">
              {SERVICE_LEVEL_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="border-r border-(color:--tf-B87333-cobre)/20 px-4 py-3 font-semibold text-(color:--tf-white)">{tr(row.param)}</td>
                  {OPERATION_PLANS.map((p) => (
                    <td key={p.id} className={cx("px-4 py-3 text-center", colClass(p.name))}>
                      {tr(String(p[row.key]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={cx(panelClass, "space-y-3 p-3 sm:p-5")}>
        <SectionTitle>{tr("Matriz de severidad y tiempos de respuesta")}</SectionTitle>
        <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">
          {tr("Tiempo máximo hasta la primera respuesta, dentro del horario de soporte de cada plan (el plan Crítico atiende P1 24x7). La recuperación de un P1 se rige por el RTO del plan.")}
        </p>

        <ul className="space-y-2 md:hidden">
          {SEVERITIES.map((s) => (
            <li key={s.id} className={cx(subPanelClass, "space-y-1.5 p-3 text-xs")}>
              <div className="font-bold text-(color:--tf-white)">{tr(s.label)}</div>
              <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr(s.definition)}</div>
              <div className="flex flex-wrap gap-1.5">
                {OPERATION_PLANS.map((p) => (
                  <Badge key={p.id} tone={highlight === p.name ? "fosforo" : "muted"}>
                    {tr(p.name)}: {tr(p.respuesta[s.id])}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-(color:--tf-B87333-cobre)/30 text-[10px] uppercase text-(color:--tf-E5A93C-laton)">
                <th className="px-3 py-2.5">{tr("Nivel")}</th>
                <th className="px-3 py-2.5">{tr("Definición técnica")}</th>
                {OPERATION_PLANS.map((p) => (
                  <th key={p.id} className={cx("px-3 py-2.5 text-center", highlight === p.name && "text-(color:--tf-22C55E-fosforo)")}>
                    {tr("Respuesta {plan}", { plan: tr(p.name) })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(color:--tf-B87333-cobre)/15 text-(color:--tf-C0C0C0-plata)">
              {SEVERITIES.map((s) => (
                <tr key={s.id}>
                  <td className={cx("whitespace-nowrap px-3 py-3 font-bold", s.id === "P1" ? "text-(color:--tf-red-400)" : s.id === "P2" ? "text-(color:--tf-E5A93C-laton)" : s.id === "P3" ? "text-(color:--tf-22D3EE-cian)" : "text-(color:--tf-94A3B8-niebla)")}>
                    {tr(s.label)}
                  </td>
                  <td className="px-3 py-3">{tr(s.definition)}</td>
                  {OPERATION_PLANS.map((p) => (
                    <td key={p.id} className={cx("whitespace-nowrap px-3 py-3 text-center", colClass(p.name))}>
                      {tr(p.respuesta[s.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ 03 · clauses

function buildClauses(): { title: string; content: string }[] {
  const [e, p, c] = OPERATION_PLANS;
  return [
    {
      title: tr("Cláusula 1: Confidencialidad Criptográfica y Principio Zero-Knowledge"),
      content: tr(
        "TWOFFACTOR garantiza bajo secreto industrial y cifrado de grado militar que ninguna llave privada, semilla o secreto de cliente será descifrado, almacenado en texto claro o transferido a terceros bajo ninguna circunstancia. Toda verificación se efectúa mediante pruebas de conocimiento cero (Zero-Knowledge Proofs), preservando la soberanía absoluta de los datos del Cliente."
      ),
    },
    {
      title: tr("Cláusula 2: Disponibilidad y Arquitectura según el Plan"),
      content: tr(
        "Los planes Profesional y Crítico operan con una arquitectura de doble cabeza activa-activa sin punto único de falla (SPOF), en múltiples zonas (Profesional) o multi-región (Crítico): si un cabezal o centro de datos se degrada, el redundante asume el 100% de la carga en menos de 400 milisegundos. El plan Esencial opera en una zona de disponibilidad y se recupera dentro de su tiempo máximo de recuperación (RTO) de {rto}.",
        { rto: tr(e.rto) }
      ),
    },
    {
      title: tr("Cláusula 3: Niveles de Servicio (SLA) y Créditos por Incumplimiento"),
      content: tr(
        "TWOFFACTOR compromete la disponibilidad mensual del plan contratado: Esencial {e}, Profesional {p} y Crítico según el acuerdo multi-región firmado con el Cliente. Si en un ciclo de facturación la disponibilidad cae por debajo del compromiso del plan, el Cliente recibirá un crédito en la siguiente mensualidad equivalente al 15% del valor mensual por cada 0,1% de indisponibilidad adicional, hasta un máximo del 50%.",
        { e: tr(e.disponibilidad), p: tr(p.disponibilidad) }
      ),
    },
    {
      title: tr("Cláusula 4: Propiedad Intelectual y Soberanía de Integración"),
      content: tr(
        "Todos los desarrollos a medida, interfaces de conexión API y configuraciones realizadas específicamente en el entorno del Cliente son de uso exclusivo y perpetuo para su infraestructura. Los algoritmos base y marcas de Twoffactor permanecen bajo titularidad de TWOFFACTOR S.A.S."
      ),
    },
    {
      title: tr("Cláusula 5: Canales de Escalamiento de Incidentes P1"),
      content: tr(
        "Los incidentes clasificados como P1 (Críticos) reciben respuesta dentro del tiempo del plan contratado — Esencial {e}, Profesional {p} y Crítico {c} — en el horario de soporte del plan. En el plan Crítico la atención de P1 es 24x7, con canal dedicado y participación directa de los fundadores y arquitectos principales (Felipe Tangarife y Juan Pablo Hurtado).",
        { e: tr(e.respuesta.P1), p: tr(p.respuesta.P1), c: tr(c.respuesta.P1) }
      ),
    },
  ];
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const { toast } = useFeedback();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          toast(tr("No se pudo copiar al portapapeles"), "warn");
        }
      }}
    >
      {copied ? tr("✓ Copiado") : tr(label)}
    </Button>
  );
}

function ClausesTab() {
  const clauses = buildClauses();
  return (
    <div className="space-y-3">
      <SectionTitle aside={<CopyButton text={clauses.map((c) => `${c.title}\n${c.content}`).join("\n\n")} label="Copiar todas" />}>
        {tr("Marco legal & cláusulas de Twoffactor")}
      </SectionTitle>
      {clauses.map((clause) => (
        <article key={clause.title} className={cx(panelClass, "space-y-2 p-3 sm:p-4")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">{clause.title}</h4>
            <CopyButton text={clause.content} label="Copiar cláusula" />
          </div>
          <p className={cx(subPanelClass, "p-3 text-xs leading-relaxed text-(color:--tf-C0C0C0-plata)")}>{clause.content}</p>
        </article>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ 04 · proposal

function ProposalTab({ clientId }: { clientId?: string }) {
  const { me } = useSession();
  const { toast } = useFeedback();
  const clients = useClients();
  const nextRef = useNextProposalRef();
  const active = clients.filter((c) => !c.archived);
  const linked = clientId ? clients.find((c) => c.id === clientId) : undefined;

  const [name, setName] = useState(linked?.name ?? "");
  const [contact, setContact] = useState(linked?.contactName ?? "");
  const [plan, setPlan] = useState<OperationPlan>(linked?.plan ?? "Profesional");
  const [nodes, setNodes] = useState(linked?.nodesAssigned ?? getPlan(linked?.plan ?? "Profesional").defaultNodes);
  const [discount, setDiscount] = useState(0);
  const [savedRef, setSavedRef] = useState<string | null>(null);

  const calc = proposalMonthlyTotal(plan, nodes, discount);
  const info = calc.plan;
  const today = new Date().toLocaleDateString(dateLocale(), { year: "numeric", month: "long", day: "numeric" });
  const ref = savedRef ?? nextRef;

  function pickClient(id: string) {
    navigate("handshake", "propuesta", id || undefined, { replace: true });
  }

  function changePlan(next: OperationPlan) {
    setPlan(next);
    setNodes(getPlan(next).defaultNodes);
    setSavedRef(null);
  }

  function printProposal() {
    const previous = document.title;
    document.title = `${ref} ${name}`.trim();
    window.print();
    document.title = previous;
  }

  function save() {
    if (!linked) return;
    const newRef = takeProposalRef();
    updateClient(
      linked.id,
      (c) => ({
        ...c,
        propuesta: {
          ...c.propuesta,
          generated: [
            { ref: newRef, plan, nodes: calc.nodes, discount: calc.discount, total: calc.total, contact: contact.trim(), createdAt: nowStamp(), createdBy: me },
            ...c.propuesta.generated,
          ],
        },
      }),
      activity(me, "Propuesta {ref} generada: plan {plan}, {total} USD/mes", { ref: newRef, plan, total: formatUsd(calc.total) })
    );
    setSavedRef(newRef);
    toast(tr("Propuesta {ref} guardada en la etapa de Propuesta de {client}", { ref: newRef, client: linked.name }));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section className={cx(panelClass, "tf-no-print space-y-3 p-3 sm:p-4 lg:col-span-5")}>
        <SectionTitle>{tr("Configurador de propuesta")}</SectionTitle>

        <Field label={tr("Rellenar desde un cliente de la Bóveda")}>
          <select value={linked?.id ?? ""} onChange={(e) => pickClient(e.target.value)} className={inputClass}>
            <option value="">{tr("— Propuesta para un prospecto (sin cliente) —")}</option>
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.id}] {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Nombre del cliente / empresa")}>
          <input value={name} onChange={(e) => { setName(e.target.value); setSavedRef(null); }} placeholder={tr("Ej: Fintech Andina S.A.S.")} className={inputClass} />
        </Field>
        <Field label={tr("Atención a (contacto principal)")}>
          <input value={contact} onChange={(e) => { setContact(e.target.value); setSavedRef(null); }} placeholder={tr("Ej: Ing. Roberto Gómez")} className={inputClass} />
        </Field>
        <Field label={tr("Plan")}>
          <select value={plan} onChange={(e) => changePlan(e.target.value as OperationPlan)} className={inputClass}>
            {OPERATION_PLANS.map((p) => (
              <option key={p.id} value={p.name}>
                {tr(p.name)} ({planPriceLabel(p)} {tr("USD/mes")})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("Nodos")} hint={tr("Incluidos: {n} · extra {price}/mes", { n: info.defaultNodes, price: formatUsd(EXTRA_NODE_PRICE_USD) })}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={16}
              value={nodes}
              onChange={(e) => { setNodes(Number(e.target.value)); setSavedRef(null); }}
              onBlur={() => setNodes(clampInt(nodes, 1, 16))}
              className={inputClass}
            />
          </Field>
          <Field label={tr("Descuento (%)")} hint={tr("Entre 0 y 40%")}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={40}
              value={discount}
              onChange={(e) => { setDiscount(Number(e.target.value)); setSavedRef(null); }}
              onBlur={() => setDiscount(clampInt(discount, 0, 40))}
              className={inputClass}
            />
          </Field>
        </div>

        <div className={cx(subPanelClass, "space-y-1 p-3 text-xs")}>
          <Row label={tr("Plan {plan}", { plan: tr(info.name) })} value={formatUsd(info.priceUsd)} />
          {calc.extraNodes > 0 && <Row label={tr("{n} nodo(s) adicional(es)", { n: calc.extraNodes })} value={`+ ${formatUsd(calc.extraNodes * EXTRA_NODE_PRICE_USD)}`} />}
          {calc.discount > 0 && <Row label={tr("Descuento {d}%", { d: calc.discount })} value={`− ${formatUsd(calc.subtotal - calc.total)}`} />}
          <div className="flex justify-between border-t border-(color:--tf-B87333-cobre)/25 pt-1 font-bold text-(color:--tf-22C55E-fosforo)">
            <span>{tr("Inversión mensual")}</span>
            <span className="font-mono text-sm text-(color:--tf-white)">
              {formatUsd(calc.total)}
              {info.priceFrom ? "+" : ""} USD
            </span>
          </div>
          {(nodes !== calc.nodes || discount !== calc.discount) && (
            <p className="text-[11px] text-(color:--tf-E5A93C-laton)">{tr("Se aplican los límites: nodos 1-16 y descuento 0-40%.")}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="brass" onClick={printProposal}>
            🖨 {tr("Imprimir / Guardar PDF")}
          </Button>
          <Button variant="outline" onClick={save} disabled={!linked || !!savedRef}>
            💾 {savedRef ? tr("Guardada") : tr("Guardar en el expediente")}
          </Button>
        </div>
        {!linked && <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Para guardarla en la etapa de Propuesta, elige un cliente de la Bóveda.")}</p>}
        {linked && (
          <button type="button" onClick={() => navigate("boveda", linked.id)} className="text-[11px] font-bold text-(color:--tf-E5A93C-laton) hover:underline">
            {tr("Ver expediente de {client} ➔", { client: linked.name })}
          </button>
        )}
      </section>

      {/* Live document: this is what prints */}
      <article className="tf-print-area space-y-4 rounded-xl border border-(color:--tf-E5A93C-laton) bg-(color:--tf-E7D8BE) p-5 font-mono text-xs text-(color:--tf-292218) shadow-2xl sm:p-6 lg:col-span-7">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-(color:--tf-8B693E)/40 pb-3">
          <div>
            <div className="text-base font-extrabold text-(color:--tf-3A2815)">{tr("TWOFFACTOR // PROPUESTA DE SERVICIO")}</div>
            <div className="text-[11px] text-(color:--tf-634825)">{tr("Fair and Fast — Seguridad de Doble Capa y Rendimiento")}</div>
          </div>
          <div className="text-right text-[10px] font-bold text-(color:--tf-634825)">
            <div>
              {tr("REF:")} {ref}
            </div>
            {!savedRef && <div className="font-normal italic">{tr("borrador: se numera al guardarla")}</div>}
          </div>
        </header>

        <div className="space-y-0.5">
          <p>
            <strong>{tr("Para:")}</strong> {name || "—"}
          </p>
          <p>
            <strong>{tr("Atención:")}</strong> {contact || "—"}
          </p>
          <p>
            <strong>{tr("Fecha de emisión:")}</strong> {today}
          </p>
        </div>

        <DocSection title={tr("1. Alcance técnico")}>
          {tr("Implementación de la infraestructura Twoffactor bajo el plan {plan} con {n} nodo(s) ({infra}).", { plan: tr(info.name), n: calc.nodes, infra: tr(info.infraestructura) })}{" "}
          {info.name === "Esencial"
            ? tr("Operación en una zona de disponibilidad con recuperación dentro del RTO del plan.")
            : tr("Arquitectura Active-Active con enclaves criptográficos independientes y conmutación en menos de 400 ms.")}
        </DocSection>

        <DocSection title={tr("2. Niveles de servicio")}>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
            <li>• {tr("Disponibilidad mensual:")} <strong>{tr(info.disponibilidad)}</strong></li>
            <li>• {tr("Respuesta P1:")} <strong>{tr(info.respuesta.P1)}</strong></li>
            <li>• RPO: <strong>{tr(info.rpo)}</strong></li>
            <li>• RTO: <strong>{tr(info.rto)}</strong></li>
            <li>• {tr("Soporte:")} <strong>{tr(info.soporte)}</strong></li>
            <li>• {tr("Backups:")} <strong>{tr(info.retencionBackups)}</strong></li>
          </ul>
        </DocSection>

        <DocSection title={tr("3. Inversión y términos")}>
          <p>
            {tr("Tarifa mensual:")} <strong>{formatUsd(calc.total)}{info.priceFrom ? "+" : ""} {tr("USD/mes")}</strong>
            {calc.discount > 0 && <> ({tr("incluye descuento del {d}%", { d: calc.discount })})</>}.
          </p>
          <p className="text-[11px] text-(color:--tf-634825)">
            {tr("Base {base}", { base: formatUsd(info.priceUsd) })}
            {calc.extraNodes > 0 && ` + ${tr("{n} nodo(s) adicional(es) a {price}", { n: calc.extraNodes, price: formatUsd(EXTRA_NODE_PRICE_USD) })}`}. {tr("Créditos por incumplimiento de SLA según la Cláusula 3.")}
          </p>
        </DocSection>

        <footer className="flex flex-wrap justify-between gap-4 border-t border-(color:--tf-8B693E)/40 pt-4 text-[11px]">
          <div>
            <p className="font-bold">Felipe Tangarife</p>
            <p className="text-[10px] text-(color:--tf-634825)">{tr("Director de Producto & Experiencia")}</p>
          </div>
          <div>
            <p className="font-bold">Juan Pablo Hurtado</p>
            <p className="text-[10px] text-(color:--tf-634825)">{tr("Director de Arquitectura & Seguridad")}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-(color:--tf-C0C0C0-plata)">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="font-bold uppercase text-(color:--tf-42311B)">{title}</div>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ 05 · programs

type ProgramId = "fundador" | "idea" | "roi";

const PROGRAMS: {
  id: ProgramId;
  kicker: string;
  title: string;
  badge: string;
  what: string;
  pillars: { title: string; value: string; detail: string }[];
  messageTitle: string;
  message: string;
  tone: "laton" | "fosforo" | "cian";
}[] = [
  {
    id: "fundador",
    kicker: "PROGRAMA 01 // ESTATUS VITALICIO & PRIVILEGIOS DE ARQUITECTO",
    title: "PROGRAMA DE CLIENTE FUNDADOR // FOUNDING PARTNER STATUS",
    badge: "CUPO LIMITADO: PRIMEROS 10 CLIENTES",
    what: "Diseñado para empresas pioneras que deciden blindar su operativa con Twoffactor desde etapas tempranas. Este estatus asegura que su empresa nunca experimente aumentos de tarifa en el futuro, disfrutando de soporte directo 24/7 con los directores arquitectos (Felipe Tangarife y Juan Pablo Hurtado), onboarding 100% bonificado y prioridad absoluta para co-crear funcionalidades a la medida de su infraestructura.",
    pillars: [
      { title: "1. TARIFA VITALICIA CONGELADA", value: "25% Descuento Perpetuo", detail: "El precio mensual no aumentará jamás durante toda la vigencia del contrato." },
      { title: "2. ENLACE DIRECTO FUNDADORES", value: "WhatsApp & Slack Privado 24/7", detail: "Contacto directo con Felipe y Juan Pablo para contingencias y estrategia técnica." },
      { title: "3. ONBOARDING & SETUP BONIFICADO", value: "$0 USD Costo de Entrada", detail: "Despliegue de conectores mTLS, enclaves bicéfalos y pruebas 100% bonificado." },
      { title: "4. CO-CREACIÓN DE ROADMAP", value: "Voz y Voto en Features", detail: "Prioridad para incorporar casos de uso e integraciones que su negocio requiera." },
    ],
    messageTitle: "Mensaje Institucional de Ejemplo // Bienvenida a Cliente Fundador:",
    message:
      "Estimado equipo directivo: Nos complace confirmar su incorporación oficial al Programa de Cliente Fundador de Twoffactor. A partir de este momento, su tarifa mensual queda formalmente congelada de por vida con un 25% de bonificación institucional. Su conector mTLS ha sido desplegado sin costo de setup y cuentan con enlace privado 24/7 directo con Felipe y Juan Pablo para cualquier requerimiento de alta prioridad.",
    tone: "laton",
  },
  {
    id: "idea",
    kicker: "PROGRAMA 02 // INCUBACIÓN TÉCNICA & DE CONCEPTO A PRODUCCIÓN",
    title: "PROGRAMA DESARROLLA TU IDEA // FROM CONCEPT TO SCALE",
    badge: "CONVOCATORIA ABIERTA PARA STARTUPS",
    what: "Creado especialmente para startups, fundadores técnicos y equipos de innovación que tienen una visión o producto digital en fase temprana. Proveemos la base técnica bicéfala, acompañamiento en diseño de arquitectura segura y mentorías de alto nivel para acelerar el paso de la idea a un aplicativo escalable en producción, sin comprometer la seguridad ni incurrir en costos prohibitivos de infraestructura.",
    pillars: [
      { title: "1. ARQUITECTURA DESDE DÍA CERO", value: "Diseño Bicéfalo & Enclaves", detail: "Estructuración de flujos Zero-Knowledge y modelos de datos resilientes." },
      { title: "2. SUBSIDIO SEMILLA (SEED)", value: "Hasta 40% OFF por 6 Meses", detail: "Alivio financiero en la fase de desarrollo para optimizar su capital de trabajo." },
      { title: "3. MENTORÍA TÉCNICA MENSUAL", value: "4h/mes de Pair Programming", detail: "Revisión de código de alta concurrencia y auditoría previa al lanzamiento." },
      { title: "4. CERTIFICACIÓN TWOFFACTOR", value: "Insignia Twoffactor Ready", detail: "Sello que avala la seguridad de su plataforma ante inversores y clientes B2B." },
    ],
    messageTitle: "Mensaje Institucional de Ejemplo // Admisión a Desarrolla tu Idea:",
    message:
      "¡Enhorabuena! Su proyecto ha sido seleccionado para el Programa 'Desarrolla tu Idea'. Durante los próximos 6 meses contarán con una bonificación del 40% en infraestructura bicéfala, 4 horas mensuales de sesión 1-a-1 de pair programming con Felipe y Juan Pablo, y acompañamiento paso a paso para lanzar su MVP al mercado con certificación de seguridad de grado bancario.",
    tone: "fosforo",
  },
  {
    id: "roi",
    kicker: "PROGRAMA 03 // OPTIMIZACIÓN FINANCIERA & RENDIMIENTO DEMOSTRABLE",
    title: "PROGRAMA RETORNO DE INVERSIÓN // ROI & EFFICIENCY GUARANTEE",
    badge: "GARANTÍA CONTRACTUAL DE EFICIENCIA",
    what: "Dirigido a directores financieros (CFO) y líderes de ingeniería que buscan garantizar que cada dólar invertido en seguridad genere un impacto económico medible. El programa cuantifica y valida el ahorro producido por la eliminación de caídas no planificadas, optimiza los consumos sobredimensionados de servidores cloud y respalda el cumplimiento del servicio mediante créditos económicos automáticos penalizables por contrato.",
    pillars: [
      { title: "1. CERO PÉRDIDAS POR DOWNTIME", value: "Conmutación Active-Active < 400 ms", detail: "Elimina las pérdidas comerciales generadas por caídas imprevistas de pasarelas o BD." },
      { title: "2. REDUCCIÓN DE GASTO CLOUD", value: "Hasta 30% Ahorro Cómputo", detail: "Optimización de servidores sobredimensionados mediante enclaves criptográficos ligeros." },
      { title: "3. GARANTÍA CONTRACTUAL SLA", value: "Créditos 15% - 50% Cuota", detail: "Créditos automáticos en la mensualidad ante cualquier incumplimiento del SLA (Cláusula 3)." },
      { title: "4. DOSSIER DE VALOR PARA JUNTA", value: "Reporte Trimestral de Retorno", detail: "Informe financiero con métricas de transacciones seguras y dinero protegido." },
    ],
    messageTitle: "Mensaje Institucional de Ejemplo // Reporte de Retorno de Inversión:",
    message:
      "Adjunto presentamos el Informe Ejecutivo de Retorno de Inversión (ROI) del período: Durante este trimestre, la arquitectura bicéfala neutralizó 3 incidentes de indisponibilidad en la nube, salvaguardando un estimado de $22,800 USD en ventas y transacciones operativas. Adicionalmente, la reestructuración de nodos permitió reducir un 24% del gasto en cómputo externo, logrando un ROI neto de 3.2x sobre la inversión mensual.",
    tone: "cian",
  },
];

const PROGRAM_TONES = {
  laton: { border: "border-(color:--tf-E5A93C-laton)", text: "text-(color:--tf-E5A93C-laton)", badge: "bg-(color:--tf-E5A93C-laton)", via: "via-(color:--tf-1A140A)" },
  fosforo: { border: "border-(color:--tf-22C55E-fosforo)", text: "text-(color:--tf-22C55E-fosforo)", badge: "bg-(color:--tf-22C55E-fosforo)", via: "via-(color:--tf-091512)" },
  cian: { border: "border-(color:--tf-22D3EE-cian)", text: "text-(color:--tf-22D3EE-cian)", badge: "bg-(color:--tf-22D3EE-cian)", via: "via-(color:--tf-0D161A)" },
};

function ProgramsTab() {
  const [filter, setFilter] = useState<"todos" | ProgramId>("todos");
  const visible = useMemo(() => PROGRAMS.filter((p) => filter === "todos" || p.id === filter), [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-(color:--tf-B87333-cobre)/25 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-(color:--tf-E5A93C-laton)">{tr("PROGRAMAS ESTRATÉGICOS // TWOFFACTOR ECOSYSTEM")}</h3>
          <p className="text-xs text-(color:--tf-94A3B8-niebla)">{tr("Iniciativas para acelerar el crecimiento y el retorno de nuestros aliados.")}</p>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
          <Chip active={filter === "todos"} tone="laton" onClick={() => setFilter("todos")}>
            {tr("Todos ({n})", { n: PROGRAMS.length })}
          </Chip>
          <Chip active={filter === "fundador"} tone="laton" onClick={() => setFilter("fundador")}>
            {tr("Cliente Fundador")}
          </Chip>
          <Chip active={filter === "idea"} onClick={() => setFilter("idea")}>
            {tr("Desarrolla tu Idea")}
          </Chip>
          <Chip active={filter === "roi"} tone="cian" onClick={() => setFilter("roi")}>
            {tr("Retorno de Inversión")}
          </Chip>
        </div>
      </div>

      {visible.map((p) => {
        const tone = PROGRAM_TONES[p.tone];
        const message = tr(p.message);
        return (
          <article key={p.id} className={cx("space-y-4 rounded-xl border-2 bg-gradient-to-r from-(color:--tf-07090F-panel) to-(color:--tf-07090F-panel) p-4 shadow-xl sm:p-5", tone.border, tone.via)}>
            <div className="flex flex-col gap-2 border-b border-(color:--tf-B87333-cobre)/30 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className={cx("block text-[10px] font-bold uppercase tracking-wider", tone.text)}>{tr(p.kicker)}</span>
                <h3 className="text-sm font-extrabold text-(color:--tf-white) sm:text-base">{tr(p.title)}</h3>
              </div>
              <span className={cx("self-start rounded-full px-3 py-1 text-[11px] font-extrabold text-(color:--tf-black)", tone.badge)}>{tr(p.badge)}</span>
            </div>
            <p className={cx(subPanelClass, "p-3 text-xs leading-relaxed text-(color:--tf-C0C0C0-plata)")}>{tr(p.what)}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {p.pillars.map((pillar) => (
                <div key={pillar.title} className={cx(subPanelClass, "space-y-1 p-3")}>
                  <div className={cx("text-[10px] font-bold uppercase", tone.text)}>{tr(pillar.title)}</div>
                  <div className="text-xs font-semibold text-(color:--tf-white)">{tr(pillar.value)}</div>
                  <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">{tr(pillar.detail)}</div>
                </div>
              ))}
            </div>
            <div className={cx(subPanelClass, "space-y-2 p-3")}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={cx("font-bold", tone.text)}>💬 {tr(p.messageTitle)}</span>
                <CopyButton text={message} label="Copiar mensaje" />
              </div>
              <p className="text-xs italic leading-relaxed text-(color:--tf-white)/90">“{message}”</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
