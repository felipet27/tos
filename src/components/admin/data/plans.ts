// Single source of truth for the commercial plans: Handshake (cards, SLA matrix,
// clauses, proposal), Bóveda (client record) and Observatorio read from here.
export type OperationPlan = "Esencial" | "Profesional" | "Crítico";

export const PLAN_NAMES: OperationPlan[] = ["Esencial", "Profesional", "Crítico"];

export interface PlanInfo {
  id: OperationPlan;
  name: OperationPlan;
  tagline: string;
  description: string;
  code: string;
  /** Monthly base price in USD (Crítico is a starting price) */
  priceUsd: number;
  priceFrom: boolean;
  disponibilidad: string;
  infraestructura: string;
  rpo: string;
  rto: string;
  retencionBackups: string;
  soporte: string;
  bolsaMejoras: string;
  seguimientoMetricas: string;
  /** Response time for each incident severity */
  respuesta: Record<Severity, string>;
  /** Nodes included in the base price */
  defaultNodes: number;
  nodesLabel: string;
  extras: string[];
}

export type Severity = "P1" | "P2" | "P3" | "P4";

/** Monthly price of each node beyond the ones included in the plan */
export const EXTRA_NODE_PRICE_USD = 600;

export const OPERATION_PLANS: PlanInfo[] = [
  {
    id: "Esencial",
    name: "Esencial",
    tagline: "PLAN INICIAL",
    description: "Para startups e infraestructura de tamaño medio que requiere validación criptográfica rápida y confiable.",
    code: "T2F-PLAN-ESENCIAL",
    priceUsd: 1200,
    priceFrom: false,
    disponibilidad: "99,5%",
    infraestructura: "Una zona de disponibilidad",
    rpo: "15 minutos",
    rto: "4 horas",
    retencionBackups: "7 días",
    soporte: "8x5 (lunes a viernes, horario hábil)",
    bolsaMejoras: "2 h/mes",
    seguimientoMetricas: "Mensual",
    respuesta: { P1: "< 2 horas", P2: "< 4 horas", P3: "< 1 día hábil", P4: "< 2 días hábiles" },
    defaultNodes: 1,
    nodesLabel: "1 nodo de verificación",
    extras: ["Niveles de servicio contractuales estándar"],
  },
  {
    id: "Profesional",
    name: "Profesional",
    tagline: "ARQUITECTURA BICÉFALA",
    description: "Doble cabeza sincronizada en varias zonas: si una cae, la otra asume la carga sin desconectar a los usuarios.",
    code: "T2F-PLAN-PROFESIONAL",
    priceUsd: 3500,
    priceFrom: false,
    disponibilidad: "99,9%",
    infraestructura: "Múltiples zonas de disponibilidad",
    rpo: "5 minutos",
    rto: "1 hora",
    retencionBackups: "14 días",
    soporte: "8x5 con respuesta prioritaria",
    bolsaMejoras: "4 h/mes",
    seguimientoMetricas: "Quincenal",
    respuesta: { P1: "< 1 hora", P2: "< 2 horas", P3: "< 4 horas hábiles", P4: "< 1 día hábil" },
    defaultNodes: 2,
    nodesLabel: "2 nodos Active-Active",
    extras: ["Enclave HSM FIPS 140-3 incluido", "Canal dedicado Slack / WhatsApp en horario de soporte"],
  },
  {
    id: "Crítico",
    name: "Crítico",
    tagline: "CORPORATIVO SOBERANO",
    description: "Para banca, fintech regulada o infraestructuras críticas globales con enclaves dedicados.",
    code: "T2F-PLAN-CRITICO",
    priceUsd: 7800,
    priceFrom: true,
    disponibilidad: "A la medida (multi-región)",
    infraestructura: "Multi-región",
    rpo: "A la medida",
    rto: "A la medida",
    retencionBackups: "35 días",
    soporte: "24x7 para incidentes críticos",
    bolsaMejoras: "A la medida",
    seguimientoMetricas: "Semanal",
    respuesta: { P1: "< 30 minutos", P2: "< 1 hora", P3: "< 2 horas", P4: "< 1 día hábil" },
    defaultNodes: 4,
    nodesLabel: "Clúster de 4+ nodos",
    extras: ["Auditoría en tiempo real y PenTest semestral", "Arquitectos fundadores como líderes de cuenta"],
  },
];

export function getPlan(name?: string | null): PlanInfo {
  return OPERATION_PLANS.find((p) => p.name === name) ?? OPERATION_PLANS[1];
}

// "99,5% (P1 < 2 horas)" — the contractual SLA shown wherever a client's plan appears
export function planSlaLabel(name?: string | null): string {
  const plan = getPlan(name);
  return `${plan.disponibilidad} · P1 ${plan.respuesta.P1}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function planPriceLabel(plan: PlanInfo): string {
  return `${formatUsd(plan.priceUsd)}${plan.priceFrom ? "+" : ""}`;
}

// Monthly total for a proposal: base price + nodes beyond the included ones, minus the discount
export function proposalMonthlyTotal(planName: string, nodes: number, discountPct: number) {
  const plan = getPlan(planName);
  const safeNodes = clampInt(nodes, 1, 16);
  const safeDiscount = clampInt(discountPct, 0, 40);
  const extraNodes = Math.max(0, safeNodes - plan.defaultNodes);
  const subtotal = plan.priceUsd + extraNodes * EXTRA_NODE_PRICE_USD;
  const total = Math.round(subtotal * (1 - safeDiscount / 100));
  return { plan, nodes: safeNodes, discount: safeDiscount, extraNodes, subtotal, total };
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export const SEVERITIES: { id: Severity; label: string; definition: string }[] = [
  { id: "P1", label: "P1 - Crítico", definition: "Caída del servicio 2FA o bloqueo total de transacciones" },
  { id: "P2", label: "P2 - Alto", definition: "Degradación de latencia (> 100ms) sin caída del sistema" },
  { id: "P3", label: "P3 - Medio", definition: "Dudas de integración, solicitudes de nuevas llaves API" },
  { id: "P4", label: "P4 - Bajo", definition: "Consultas generales, mejoras sugeridas al roadmap" },
];

// Rows of the official "Niveles de servicio por plan" table
export const SERVICE_LEVEL_ROWS: { param: string; key: keyof PlanInfo }[] = [
  { param: "Disponibilidad mensual de la plataforma", key: "disponibilidad" },
  { param: "Infraestructura", key: "infraestructura" },
  { param: "Máxima pérdida de datos (RPO)", key: "rpo" },
  { param: "Tiempo máximo de recuperación (RTO)", key: "rto" },
  { param: "Retención de copias de seguridad", key: "retencionBackups" },
  { param: "Horario de soporte", key: "soporte" },
  { param: "Bolsa de mejoras", key: "bolsaMejoras" },
  { param: "Seguimiento de métricas", key: "seguimientoMetricas" },
];
