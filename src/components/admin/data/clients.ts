"use client";

import { createLocalStore, nextSequentialId, useLocalStore } from "./store";
import { OPERATOR_NODES, OperatorName, normalizeOperator, partnerOf } from "./operators";
import { PLAN_NAMES, OperationPlan, getPlan, planSlaLabel } from "./plans";
import { nowStamp, todayStamp } from "./time";
import { SEED_CLIENTS } from "./seedClients";
import { ProgramId, PROGRAM_IDS } from "./programs";

// ------------------------------------------------------------------ stages

export type ProjectStageId = 1 | 2 | 3 | 4 | 5;
export type StageSigla = "L" | "P" | "D" | "MB";

export interface StageInfo {
  id: ProjectStageId;
  name: string;
  shortName: string;
  sigla: StageSigla;
  description: string;
}

export const STAGES_CONFIG: StageInfo[] = [
  { id: 1, name: "Levantamiento de Requisitos", shortName: "Levantamiento", sigla: "L", description: "Cuaderno técnico de notas e información entregada por el cliente" },
  { id: 2, name: "Propuesta de Twoffactor", shortName: "Propuesta", sigla: "P", description: "Presentación ejecutiva, PDF resumen y URL prototipo del aplicativo" },
  { id: 3, name: "Desarrollo", shortName: "Desarrollo", sigla: "D", description: "Repositorios GitHub, ramas y control de despliegues continuos" },
  { id: 4, name: "Marcha Blanca", shortName: "Marcha Blanca", sigla: "MB", description: "Fases sandbox piloto y acuerdos/escritos clave con el cliente" },
  { id: 5, name: "Salida a Producción", shortName: "Producción", sigla: "P", description: "Panel de telemetría, disponibilidad y bitácora de producción" },
];

export function getStage(id: number): StageInfo {
  return STAGES_CONFIG.find((s) => s.id === id) ?? STAGES_CONFIG[0];
}

// ------------------------------------------------------------------ record types

export interface StoredFile {
  key: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: OperatorName;
}

export type ProposalSlotId = "presentacion" | "pdf" | "demo";

export interface ProposalSlot {
  url: string;
  file?: StoredFile;
  /** File name recorded before uploads existed: the file itself was never stored */
  legacyFileName?: string;
}

export interface GeneratedProposal {
  ref: string;
  plan: OperationPlan;
  nodes: number;
  discount: number;
  total: number;
  contact: string;
  createdAt: string;
  createdBy: OperatorName;
}

export interface PropuestaData {
  slots: Record<ProposalSlotId, ProposalSlot>;
  generated: GeneratedProposal[];
}

export interface LevantamientoNote {
  id: string;
  author: OperatorName;
  text: string;
  date: string;
  editedAt?: string;
}

export interface GithubRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  status: "Activo" | "Sincronizado" | "En Revisión";
}

export interface MarchaBlancaSubStage {
  id: string;
  title: string;
  description: string;
  done: boolean;
  doneAt?: string;
  doneBy?: OperatorName;
}

export interface MarchaBlancaEscrito {
  id: string;
  title: string;
  content: string;
  author: OperatorName;
  date: string;
  editedAt?: string;
}

export type ProduccionNoteType = "ok" | "alerta" | "mantenimiento";

export interface ProduccionNote {
  id: string;
  text: string;
  type: ProduccionNoteType;
  date: string;
  author: OperatorName;
  editedAt?: string;
}

export type ValidationStatus = "pendiente" | "aprobado" | "cambios";

export interface ReviewEvent {
  by: OperatorName;
  at: string;
  action: "aprobado" | "cambios" | "reenviado";
  note?: string;
}

export interface StageValidation {
  stageId: ProjectStageId;
  sigla: StageSigla;
  stageName: string;
  author: OperatorName;
  authorNode: string;
  completedAt: string;
  activitySummary: string;
  validatedBy: OperatorName | null;
  validatedAt: string | null;
  validationNote?: string;
  status: ValidationStatus;
  reviewHistory?: ReviewEvent[];
}

export type ClientStatus = "Activo" | "En Implementación" | "Piloto" | "En Pausa";

export interface ClientActivity {
  id: string;
  at: string;
  by: OperatorName;
  /** Spanish template, translated when shown: "Etapa cambiada a {stage}" */
  action: string;
  vars?: Record<string, string | number>;
}

export interface ClientRecord {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  plan: OperationPlan;
  status: ClientStatus;
  nodesAssigned: number;
  sla: string;
  createdAt: string;
  notes: string;
  token2FA: string;
  currentStage: ProjectStageId;
  createdBy: OperatorName;
  programs?: ProgramId[];
  archived: boolean;
  archivedAt?: string;
  telemetryUrl: string;
  stageValidations: StageValidation[];
  levantamientoNotes: LevantamientoNote[];
  propuesta: PropuestaData;
  githubRepos: GithubRepo[];
  marchaBlancaStages: MarchaBlancaSubStage[];
  marchaBlancaEscritos: MarchaBlancaEscrito[];
  produccionNotes: ProduccionNote[];
  activity: ClientActivity[];
}

interface LegacyPropuesta {
  presentationFileName?: string;
  pdfSummaryFileName?: string;
  appDemoUrl?: string;
  presentationUrl?: string;
  pdfSummaryUrl?: string;
  appDemoFileName?: string;
}

// Anything that may come out of localStorage or the seed file
export type RawClient = {
  [K in keyof ClientRecord]?: K extends "propuesta" ? PropuestaData | LegacyPropuesta : unknown;
};

// ------------------------------------------------------------------ sanitizing

const CLIENT_STATUSES: ClientStatus[] = ["Activo", "En Implementación", "Piloto", "En Pausa"];

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function operator(value: unknown, fallback: OperatorName = "Felipe"): OperatorName {
  return normalizeOperator(str(value)) ?? fallback;
}

function migratePlan(value: unknown): OperationPlan {
  const plan = str(value);
  if (PLAN_NAMES.includes(plan as OperationPlan)) return plan as OperationPlan;
  if (plan === "Starter 2FA Shield") return "Esencial";
  if (plan.includes("Enterprise") || plan.includes("Bicéfalo")) return "Crítico";
  return "Profesional";
}

function emptySlot(): ProposalSlot {
  return { url: "" };
}

function sanitizePropuesta(value: unknown): PropuestaData {
  const p = (value ?? {}) as Partial<PropuestaData> & LegacyPropuesta;
  if (p.slots) {
    return {
      slots: {
        presentacion: { ...emptySlot(), ...p.slots.presentacion },
        pdf: { ...emptySlot(), ...p.slots.pdf },
        demo: { ...emptySlot(), ...p.slots.demo },
      },
      generated: arr<GeneratedProposal>(p.generated),
    };
  }
  return {
    slots: {
      presentacion: { url: str(p.presentationUrl), legacyFileName: str(p.presentationFileName) || undefined },
      pdf: { url: str(p.pdfSummaryUrl), legacyFileName: str(p.pdfSummaryFileName) || undefined },
      demo: { url: str(p.appDemoUrl), legacyFileName: str(p.appDemoFileName) || undefined },
    },
    generated: [],
  };
}

function sanitizeValidation(v: Partial<StageValidation>): StageValidation {
  const stageId = Number(v.stageId) as ProjectStageId;
  const stage = getStage(stageId);
  const author = operator(v.author);
  const status: ValidationStatus = v.status === "aprobado" || v.status === "cambios" ? v.status : "pendiente";
  return {
    stageId: stage.id,
    sigla: stage.sigla,
    stageName: stage.name,
    author,
    authorNode: OPERATOR_NODES[author],
    completedAt: str(v.completedAt, nowStamp()),
    activitySummary: str(v.activitySummary),
    validatedBy: v.validatedBy ? operator(v.validatedBy) : null,
    validatedAt: v.validatedAt ?? null,
    validationNote: v.validationNote,
    status,
    reviewHistory: arr<ReviewEvent>(v.reviewHistory),
  };
}

const DEFAULT_SUMMARIES: Record<ProjectStageId, string> = {
  1: "Requisitos técnicos, arquitectura y notas base",
  2: "Propuesta de valor Twoffactor y prototipo funcional",
  3: "Repositorios GitHub, contratos y ramas de desarrollo",
  4: "Marcha blanca, pruebas piloto y acuerdos operativos",
  5: "Despliegue a producción y telemetría activa en tiempo real",
};

// One validation per reached stage; stages reached without a record get an approved
// placeholder (past stages) or a pending one (the current stage)
function ensureValidations(currentStage: ProjectStageId, existing: StageValidation[], createdAt: string, createdBy: OperatorName) {
  const result: StageValidation[] = [];
  for (let s = 1; s <= currentStage; s++) {
    const stageId = s as ProjectStageId;
    const found = existing.find((v) => v.stageId === stageId);
    if (found) {
      result.push(found);
      continue;
    }
    const stage = getStage(stageId);
    const isCurrent = s === currentStage;
    result.push({
      stageId,
      sigla: stage.sigla,
      stageName: stage.name,
      author: createdBy,
      authorNode: OPERATOR_NODES[createdBy],
      completedAt: `${createdAt} 10:00`,
      activitySummary: DEFAULT_SUMMARIES[stageId],
      validatedBy: isCurrent ? null : partnerOf(createdBy),
      validatedAt: isCurrent ? null : `${createdAt} 16:30`,
      validationNote: isCurrent ? undefined : "Validado conforme a estándar bicéfalo.",
      status: isCurrent ? "pendiente" : "aprobado",
      reviewHistory: [],
    });
  }
  return result;
}

export function sanitizeClient(raw: RawClient, index: number): ClientRecord {
  const seedMatch =
    SEED_CLIENTS.find((s) => s.id === raw.id) ??
    SEED_CLIENTS.find((s) => str(s.name).toLowerCase() === str(raw.name).toLowerCase());
  const c: RawClient = { ...(seedMatch ?? {}), ...raw };

  let id = str(c.id);
  if (!id || id.startsWith("CLI-")) id = str(seedMatch?.id) || `FF-${String(index + 1).padStart(3, "0")}`;

  const stageNum = Number(c.currentStage);
  const currentStage = ([1, 2, 3, 4, 5].includes(stageNum) ? stageNum : 1) as ProjectStageId;
  const plan = migratePlan(c.plan);
  const createdAt = str(c.createdAt, todayStamp());
  const createdBy = operator(c.createdBy);
  const validations = arr<Partial<StageValidation>>(c.stageValidations)
    .filter((v) => Number(v.stageId) <= currentStage)
    .map(sanitizeValidation);
  const nodes = Number(c.nodesAssigned);

  return {
    id: id.toUpperCase(),
    name: str(c.name, "Cliente sin nombre"),
    industry: str(c.industry),
    contactName: str(c.contactName),
    contactEmail: str(c.contactEmail),
    contactPhone: str(c.contactPhone),
    plan,
    status: CLIENT_STATUSES.includes(c.status as ClientStatus) ? (c.status as ClientStatus) : "Activo",
    nodesAssigned: Number.isFinite(nodes) && nodes > 0 ? nodes : getPlan(plan).defaultNodes,
    sla: planSlaLabel(plan),
    createdAt,
    notes: str(c.notes),
    token2FA: str(c.token2FA),
    currentStage,
    createdBy,
    programs: Array.isArray(c.programs) ? (c.programs as unknown[]).filter((id): id is ProgramId => PROGRAM_IDS.includes(id as ProgramId)) : undefined,
    archived: c.archived === true,
    archivedAt: typeof c.archivedAt === "string" ? c.archivedAt : undefined,
    telemetryUrl: str(c.telemetryUrl),
    stageValidations: ensureValidations(currentStage, validations, createdAt, createdBy),
    levantamientoNotes: arr<LevantamientoNote>(c.levantamientoNotes).map((n) => ({ ...n, author: operator(n.author) })),
    propuesta: sanitizePropuesta(c.propuesta),
    githubRepos: arr<GithubRepo>(c.githubRepos),
    marchaBlancaStages: arr<MarchaBlancaSubStage>(c.marchaBlancaStages),
    marchaBlancaEscritos: arr<MarchaBlancaEscrito>(c.marchaBlancaEscritos).map((e) => ({ ...e, author: operator(e.author) })),
    produccionNotes: arr<ProduccionNote>(c.produccionNotes).map((n) => ({ ...n, author: operator(n.author) })),
    activity: arr<ClientActivity>(c.activity),
  };
}

export function sanitizeClients(raw: unknown[]): ClientRecord[] {
  const seen = new Set<string>();
  return raw
    .filter((c): c is RawClient => !!c && typeof c === "object")
    .map(sanitizeClient)
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
}

// ------------------------------------------------------------------ store

export const STORAGE_KEY_CLIENTS = "twoffactor_boveda_clients_v10";

function seedClients(): ClientRecord[] {
  try {
    const legacy = localStorage.getItem("twoffactor_boveda_clients_v9");
    const parsed: unknown = legacy ? JSON.parse(legacy) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return sanitizeClients(parsed);
  } catch {
    // No legacy data
  }
  return sanitizeClients(SEED_CLIENTS);
}

export const clientsStore = createLocalStore<ClientRecord[]>(STORAGE_KEY_CLIENTS, seedClients, (raw) =>
  Array.isArray(raw) ? sanitizeClients(raw) : null
);

export function useClients(): ClientRecord[] {
  return useLocalStore(clientsStore);
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function activity(by: OperatorName, action: string, vars?: ClientActivity["vars"]): ClientActivity {
  return { id: newId("act"), at: nowStamp(), by, action, vars };
}

// Applies `updater` to one client and optionally appends an entry to its timeline
export function updateClient(id: string, updater: (c: ClientRecord) => ClientRecord, log?: ClientActivity) {
  clientsStore.set((list) =>
    list.map((c) => {
      if (c.id !== id) return c;
      const next = updater(c);
      return log ? { ...next, activity: [log, ...next.activity] } : next;
    })
  );
}

export function addClient(client: ClientRecord) {
  clientsStore.set((list) => [client, ...list]);
}

export function deleteClient(id: string) {
  clientsStore.set((list) => list.filter((c) => c.id !== id));
}

export function getNextClientId(list: ClientRecord[]): string {
  return nextSequentialId("FF-", list.map((c) => c.id), 3);
}

export function generateClientToken(name: string): string {
  const code = (name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || "CLI").toUpperCase();
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return `2FA-${code}-${String(1000 + (bytes[0] % 9000))}`;
}

// ------------------------------------------------------------------ stage workflow (two-man rule)

// A client can only move forward once every stage reached so far has the partner's sign-off
export function stageBlockers(client: ClientRecord): StageValidation[] {
  return client.stageValidations.filter((v) => v.stageId <= client.currentStage && v.status !== "aprobado");
}

export function advanceClientStage(client: ClientRecord, by: OperatorName, summary: string): ClientRecord {
  if (client.currentStage >= 5 || stageBlockers(client).length > 0) return client;
  const nextStage = (client.currentStage + 1) as ProjectStageId;
  const stage = getStage(nextStage);
  const validation: StageValidation = {
    stageId: nextStage,
    sigla: stage.sigla,
    stageName: stage.name,
    author: by,
    authorNode: OPERATOR_NODES[by],
    completedAt: nowStamp(),
    activitySummary: summary.trim() || DEFAULT_SUMMARIES[nextStage],
    validatedBy: null,
    validatedAt: null,
    status: "pendiente",
    reviewHistory: [],
  };
  return {
    ...client,
    currentStage: nextStage,
    stageValidations: [...client.stageValidations.filter((v) => v.stageId < nextStage), validation],
  };
}

// Going back drops the sign-offs of the stages left behind: they must be approved again
export function moveClientBack(client: ClientRecord, target: ProjectStageId): ClientRecord {
  if (target >= client.currentStage) return client;
  return {
    ...client,
    currentStage: target,
    stageValidations: client.stageValidations.filter((v) => v.stageId <= target),
  };
}

export function reviewValidation(
  client: ClientRecord,
  stageId: ProjectStageId,
  reviewer: OperatorName,
  decision: "aprobado" | "cambios",
  note: string
): ClientRecord {
  const at = nowStamp();
  return {
    ...client,
    stageValidations: client.stageValidations.map((v) => {
      if (v.stageId !== stageId || v.author === reviewer || v.status !== "pendiente") return v;
      return {
        ...v,
        status: decision,
        validatedBy: decision === "aprobado" ? reviewer : null,
        validatedAt: decision === "aprobado" ? at : null,
        validationNote: note.trim() || undefined,
        reviewHistory: [...(v.reviewHistory ?? []), { by: reviewer, at, action: decision, note: note.trim() || undefined }],
      };
    }),
  };
}

export function resubmitValidation(client: ClientRecord, stageId: ProjectStageId, by: OperatorName, summary: string): ClientRecord {
  const at = nowStamp();
  return {
    ...client,
    stageValidations: client.stageValidations.map((v) => {
      if (v.stageId !== stageId || v.author !== by || v.status !== "cambios") return v;
      return {
        ...v,
        status: "pendiente",
        activitySummary: summary.trim() || v.activitySummary,
        completedAt: at,
        reviewHistory: [...(v.reviewHistory ?? []), { by, at, action: "reenviado", note: summary.trim() || undefined }],
      };
    }),
  };
}

// ------------------------------------------------------------------ timeline

export type TimelineTone = "stage" | "approved" | "changes" | "note" | "file" | "prod" | "edit" | "danger";

export interface TimelineEvent {
  id: string;
  at: string;
  by: OperatorName;
  action: string;
  vars?: Record<string, string | number>;
  detail?: string;
  tone: TimelineTone;
}

export function buildTimeline(client: ClientRecord): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "created",
      at: client.createdAt,
      by: client.createdBy,
      action: "Cliente registrado en la Bóveda",
      tone: "edit",
    },
  ];

  client.stageValidations.forEach((v) => {
    events.push({
      id: `stage-${v.stageId}`,
      at: v.completedAt,
      by: v.author,
      action: "Etapa [{sigla}] {stage} registrada para revisión",
      vars: { sigla: v.sigla, stage: v.stageName },
      detail: v.activitySummary,
      tone: "stage",
    });
    const history = v.reviewHistory ?? [];
    history.forEach((h, i) => {
      events.push({
        id: `review-${v.stageId}-${i}`,
        at: h.at,
        by: h.by,
        action:
          h.action === "aprobado"
            ? "Visto bueno a la etapa [{sigla}] {stage}"
            : h.action === "cambios"
            ? "Cambios solicitados en la etapa [{sigla}] {stage}"
            : "Etapa [{sigla}] {stage} reenviada a revisión",
        vars: { sigla: v.sigla, stage: v.stageName },
        detail: h.note,
        tone: h.action === "aprobado" ? "approved" : h.action === "cambios" ? "changes" : "stage",
      });
    });
    // Approvals recorded before review history existed
    if (v.status === "aprobado" && v.validatedAt && v.validatedBy && !history.some((h) => h.action === "aprobado")) {
      events.push({
        id: `approved-${v.stageId}`,
        at: v.validatedAt,
        by: v.validatedBy,
        action: "Visto bueno a la etapa [{sigla}] {stage}",
        vars: { sigla: v.sigla, stage: v.stageName },
        detail: v.validationNote,
        tone: "approved",
      });
    }
  });

  client.levantamientoNotes.forEach((n) =>
    events.push({ id: n.id, at: n.date, by: n.author, action: "Nota de levantamiento", detail: n.text, tone: "note" })
  );
  client.marchaBlancaEscritos.forEach((e) =>
    events.push({ id: e.id, at: e.date, by: e.author, action: "Escrito de marcha blanca: {title}", vars: { title: e.title }, detail: e.content, tone: "note" })
  );
  client.produccionNotes.forEach((n) =>
    events.push({
      id: n.id,
      at: n.date,
      by: n.author,
      action: n.type === "alerta" ? "Alerta de producción" : n.type === "mantenimiento" ? "Ventana de mantenimiento" : "Nota de producción",
      detail: n.text,
      tone: n.type === "alerta" ? "danger" : "prod",
    })
  );
  client.activity.forEach((a) => events.push({ id: a.id, at: a.at, by: a.by, action: a.action, vars: a.vars, tone: "edit" }));

  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

// ------------------------------------------------------------------ files

export function fileUrl(file: StoredFile, inline = false): string {
  const path = file.key.split("/").map(encodeURIComponent).join("/");
  return `/api/files/${path}${inline ? "?inline=1" : ""}`;
}

export async function uploadClientFile(clientId: string, file: File, by: OperatorName): Promise<StoredFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("clientId", clientId);
  const res = await fetch("/api/files", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { key: string; name: string; size: number; type: string };
  return { ...data, uploadedAt: nowStamp(), uploadedBy: by };
}

export async function deleteStoredFile(file: StoredFile): Promise<void> {
  await fetch(fileUrl(file), { method: "DELETE" }).catch(() => undefined);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
