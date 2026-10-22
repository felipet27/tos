"use client";

import { createLocalStore, nextSequentialId, useLocalStore } from "./store";
import { OperatorName, normalizeOperator, partnerOf } from "./operators";
import { nowStamp, parseStamp, todayStamp } from "./time";
import type { ReviewEvent, ValidationStatus } from "./clients";
import { SEED_TASKS } from "./seedTasks";

// ------------------------------------------------------------------ types

export type TaskStatus = "Por Hacer" | "En Progreso" | "En Revisión" | "Desplegado";
export type TaskPriority = "P1" | "P2" | "P3";

export const TASK_STATUSES: TaskStatus[] = ["Por Hacer", "En Progreso", "En Revisión", "Desplegado"];

export const REPOS = [
  "twoffactor/web",
  "twoffactor/engine-crypto",
  "twoffactor/sentinel-sync",
  "twoffactor/sdk-clients",
] as const;
export type RepoName = (typeof REPOS)[number];

export interface AuditLog {
  id: string;
  modifiedBy: string;
  timestamp: string;
  /** Spanish template, translated when shown */
  action: string;
  vars?: Record<string, string | number>;
  details?: string;
}

// Partner sign-off required to move a task from "En Revisión" to "Desplegado"
export interface TaskReview {
  status: ValidationStatus;
  author: OperatorName;
  requestedAt: string;
  reviewedBy?: OperatorName;
  reviewedAt?: string;
  note?: string;
  history: ReviewEvent[];
}

export interface DevTask {
  id: string;
  title: string;
  description: string;
  repo: RepoName;
  branch: string;
  assignee: OperatorName;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number;
  commitSha?: string;
  createdAt: string;
  startDate: string;
  dueDateTime: string;
  completedAt?: string;
  sprintId?: string;
  ideaId?: string;
  review?: TaskReview;
  history: AuditLog[];
}

export type RawTask = Partial<Omit<DevTask, "assignee" | "repo">> & { assignee?: string; repo?: string };

export type SprintStatus = "planificado" | "activo" | "cerrado";

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  start: string;
  end: string;
  status: SprintStatus;
  closedAt?: string;
}

export type AdrStatus = "Propuesto" | "Aprobado" | "Reemplazado" | "Rechazado";

export interface Adr {
  id: string;
  title: string;
  context: string;
  decision: string;
  status: AdrStatus;
  date: string;
  author: OperatorName;
}

// ------------------------------------------------------------------ helpers

export function auditLog(by: string, action: string, vars?: AuditLog["vars"], details?: string): AuditLog {
  return { id: `log-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, modifiedBy: by, timestamp: nowStamp(), action, vars, details };
}

export function githubRepoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

export function githubBranchUrl(repo: string, branch: string): string | null {
  const clean = branch.trim();
  if (!clean) return null;
  return `${githubRepoUrl(repo)}/tree/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

export function isCommitSha(value?: string): value is string {
  return !!value && /^[0-9a-f]{6,40}$/i.test(value.trim());
}

export function githubCommitUrl(repo: string, sha?: string): string | null {
  return isCommitSha(sha) ? `${githubRepoUrl(repo)}/commit/${sha.trim()}` : null;
}

// ------------------------------------------------------------------ sanitizing

function sanitizeTask(raw: RawTask): DevTask {
  const status = TASK_STATUSES.includes(raw.status as TaskStatus) ? (raw.status as TaskStatus) : "Por Hacer";
  const assignee = normalizeOperator(raw.assignee) ?? "Felipe";
  const createdAt = raw.createdAt ?? todayStamp();
  let review = raw.review;
  // Tasks deployed before the sign-off rule existed count as approved
  if (!review && status === "Desplegado") {
    review = { status: "aprobado", author: assignee, requestedAt: raw.completedAt ?? createdAt, reviewedBy: partnerOf(assignee), reviewedAt: raw.completedAt ?? createdAt, history: [] };
  }
  if (!review && status === "En Revisión") {
    review = { status: "pendiente", author: assignee, requestedAt: raw.startDate ?? createdAt, history: [] };
  }
  const commit = raw.commitSha && isCommitSha(raw.commitSha) ? raw.commitSha : undefined;
  return {
    id: raw.id ?? "DEV-000",
    title: raw.title ?? "",
    description: raw.description ?? "",
    repo: REPOS.includes(raw.repo as RepoName) ? (raw.repo as RepoName) : "twoffactor/web",
    branch: raw.branch ?? "",
    assignee,
    status,
    priority: raw.priority === "P1" || raw.priority === "P3" ? raw.priority : "P2",
    storyPoints: Number(raw.storyPoints) || 3,
    commitSha: commit,
    createdAt,
    startDate: raw.startDate ?? createdAt,
    dueDateTime: raw.dueDateTime ?? `${createdAt} 18:00`,
    completedAt: status === "Desplegado" ? raw.completedAt ?? createdAt : undefined,
    sprintId: raw.sprintId,
    ideaId: raw.ideaId,
    review,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

const SEED_SPRINTS: Sprint[] = [
  {
    id: "SPR-01",
    name: "Sprint 1 · Enclave bicéfalo",
    goal: "Bajar el handshake mTLS a menos de 4ms y cerrar la rotación de llaves.",
    start: "2026-10-13",
    end: "2026-10-24",
    status: "activo",
  },
];

const SEED_ADRS: Adr[] = [
  {
    id: "ADR-001",
    title: "Redundancia Activa-Activa en lugar de Activa-Pasiva",
    context: "Una arquitectura activa-pasiva deja tiempo muerto mientras el nodo pasivo despierta.",
    decision: "Implementar dos cabezas de procesamiento que responden solicitudes simultáneamente. Si una cabeza requiere mantenimiento o sufre degradación, la otra procesa el 100% de transacciones sin desconexión de clientes.",
    status: "Aprobado",
    date: "2026-09-02",
    author: "Juan Pablo",
  },
  {
    id: "ADR-002",
    title: "Aislamiento Criptográfico con Zero-Knowledge Proofs",
    context: "Custodiar llaves privadas de clientes concentra el riesgo de una filtración masiva.",
    decision: "Las llaves maestras nunca salen del enclave seguro del cliente. Twoffactor verifica desafíos matemáticos sin custodiar llaves privadas ajenas, eliminando el riesgo de filtraciones masivas de contraseñas.",
    status: "Aprobado",
    date: "2026-09-10",
    author: "Juan Pablo",
  },
  {
    id: "ADR-003",
    title: "Pipeline de Despliegue en Edge Workers sin Servidor Central",
    context: "Un servidor central añade latencia a los clientes lejos de Bogotá.",
    decision: "Ejecutar validaciones en más de 300 ciudades con Cloudflare Workers y V8 Isolates, garantizando tiempos de respuesta sub-10ms en cualquier punto de América y Europa.",
    status: "Aprobado",
    date: "2026-09-18",
    author: "Felipe",
  },
];

// ------------------------------------------------------------------ stores

export const tasksStore = createLocalStore<DevTask[]>(
  "twoffactor_taller_tasks_v7",
  () => {
    try {
      const legacy = localStorage.getItem("twoffactor_taller_tasks_v6");
      const parsed: unknown = legacy ? JSON.parse(legacy) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t: RawTask) => sanitizeTask({ ...t, sprintId: t.sprintId ?? "SPR-01" }));
      }
    } catch {
      // No legacy data
    }
    return SEED_TASKS.map(sanitizeTask);
  },
  (raw) => (Array.isArray(raw) ? raw.map((t: RawTask) => sanitizeTask(t)) : null)
);

export const sprintsStore = createLocalStore<Sprint[]>("twoffactor_taller_sprints_v1", () => SEED_SPRINTS, (raw) =>
  Array.isArray(raw) ? (raw as Sprint[]) : null
);

export const adrsStore = createLocalStore<Adr[]>("twoffactor_taller_adrs_v1", () => SEED_ADRS, (raw) =>
  Array.isArray(raw) ? (raw as Adr[]) : null
);

export function useTasks() {
  return useLocalStore(tasksStore);
}
export function useSprints() {
  return useLocalStore(sprintsStore);
}
export function useAdrs() {
  return useLocalStore(adrsStore);
}

export function nextTaskId(tasks: DevTask[]): string {
  const ids = tasks.map((t) => t.id);
  // Seed tasks start at DEV-101
  return nextSequentialId("DEV-", ids.length ? ids : ["DEV-100"], 3);
}

export function nextSprintId(sprints: Sprint[]): string {
  return nextSequentialId("SPR-", sprints.map((s) => s.id), 2);
}

export function nextAdrId(adrs: Adr[]): string {
  return nextSequentialId("ADR-", adrs.map((a) => a.id), 3);
}

export function updateTask(id: string, updater: (t: DevTask) => DevTask) {
  tasksStore.set((list) => list.map((t) => (t.id === id ? updater(t) : t)));
}

// ------------------------------------------------------------------ status workflow

export type StatusChangeResult = { ok: true; task: DevTask } | { ok: false; reason: string; vars?: Record<string, string> };

// Moves a task to another column, enforcing the partner sign-off before "Desplegado"
export function changeTaskStatus(task: DevTask, target: TaskStatus, by: OperatorName, how: string): StatusChangeResult {
  if (task.status === target) return { ok: true, task };

  if (target === "Desplegado" && task.review?.status !== "aprobado") {
    return {
      ok: false,
      reason:
        task.status === "En Revisión"
          ? "{id} necesita el visto bueno de {name} en Observatorio antes de desplegarse."
          : "{id} debe pasar por En Revisión y recibir el visto bueno de {name} antes de desplegarse.",
      vars: { id: task.id, name: partnerOf(task.assignee) },
    };
  }

  let review = task.review;
  if (target === "En Revisión" && (!review || review.status !== "aprobado")) {
    review = { status: "pendiente", author: task.assignee, requestedAt: nowStamp(), history: review?.history ?? [] };
  }
  // Leaving review (backwards) cancels the pending request; work changed, it must be reviewed again
  if (target === "Por Hacer" || target === "En Progreso") review = undefined;

  const log = auditLog(by, "Estado cambiado de '{from}' a '{to}'", { from: task.status, to: target }, how);
  return {
    ok: true,
    task: {
      ...task,
      status: target,
      review,
      completedAt: target === "Desplegado" ? nowStamp() : undefined,
      history: [log, ...task.history],
    },
  };
}

export function reviewTask(task: DevTask, reviewer: OperatorName, decision: "aprobado" | "cambios", note: string): DevTask {
  if (!task.review || task.review.status !== "pendiente" || task.review.author === reviewer) return task;
  const at = nowStamp();
  const event: ReviewEvent = { by: reviewer, at, action: decision, note: note.trim() || undefined };
  const log = auditLog(
    reviewer,
    decision === "aprobado" ? "Visto bueno de QA otorgado" : "Cambios solicitados en revisión",
    undefined,
    note.trim() || undefined
  );
  return {
    ...task,
    // Changes requested send the task back to work
    status: decision === "cambios" ? "En Progreso" : task.status,
    review: {
      ...task.review,
      status: decision,
      reviewedBy: reviewer,
      reviewedAt: at,
      note: note.trim() || undefined,
      history: [...task.review.history, event],
    },
    history: [log, ...task.history],
  };
}

// ------------------------------------------------------------------ deadlines

export type TaskDeadlineStatus = "en_tiempo" | "por_vencer" | "retrasada" | "completada_a_tiempo" | "completada_tarde";

export interface TaskTimeMetrics {
  status: TaskDeadlineStatus;
  label: string;
  vars?: Record<string, string | number>;
  badgeClass: string;
  icon: string;
  isHealthy: boolean;
}

function durationVars(ms: number) {
  const hours = Math.max(1, Math.round(ms / 3_600_000));
  return hours >= 24 ? { d: Math.floor(hours / 24), h: hours % 24 } : { d: 0, h: hours };
}

export function getTaskTimeMetrics(task: DevTask, now: number): TaskTimeMetrics {
  const due = parseStamp(task.dueDateTime);

  if (task.status === "Desplegado") {
    const completed = parseStamp(task.completedAt) || now;
    const onTime = isNaN(due) || completed <= due;
    return onTime
      ? { status: "completada_a_tiempo", label: "Desplegada a tiempo", badgeClass: "bg-(color:--tf-22C55E-fosforo)/20 text-(color:--tf-22C55E-fosforo) border-(color:--tf-22C55E-fosforo)/40", icon: "✓", isHealthy: true }
      : { status: "completada_tarde", label: "Desplegada con retraso", badgeClass: "bg-(color:--tf-64748B)/20 text-(color:--tf-94A3B8-niebla) border-(color:--tf-64748B)/40", icon: "⚠", isHealthy: false };
  }

  if (isNaN(due)) {
    return { status: "en_tiempo", label: "En cronograma", badgeClass: "bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo) border-(color:--tf-22C55E-fosforo)/30", icon: "✓", isHealthy: true };
  }

  const diff = due - now;
  if (diff < 0) {
    const v = durationVars(-diff);
    return {
      status: "retrasada",
      label: v.d ? "Retrasada {d}d {h}h" : "Retrasada {h}h",
      vars: v,
      badgeClass: "bg-(color:--tf-red-950)/80 text-(color:--tf-red-400) border-(color:--tf-red-500)/60",
      icon: "!",
      isHealthy: false,
    };
  }
  if (diff <= 12 * 3_600_000) {
    const v = durationVars(diff);
    return {
      status: "por_vencer",
      label: "Vence en ~{h}h",
      vars: v,
      badgeClass: "bg-(color:--tf-E5A93C-laton)/20 text-(color:--tf-E5A93C-laton) border-(color:--tf-E5A93C-laton)/50",
      icon: "⏳",
      isHealthy: false,
    };
  }
  const v = durationVars(diff);
  return {
    status: "en_tiempo",
    label: v.d ? "A tiempo ({d}d {h}h)" : "A tiempo ({h}h)",
    vars: v,
    badgeClass: "bg-(color:--tf-22C55E-fosforo)/15 text-(color:--tf-22C55E-fosforo) border-(color:--tf-22C55E-fosforo)/35",
    icon: "✓",
    isHealthy: true,
  };
}

export function activeSprint(sprints: Sprint[]): Sprint | undefined {
  return sprints.find((s) => s.status === "activo");
}

// Cultivo → Taller: an approved idea becomes a backlog task linked to it
export function createTaskFromIdea(
  idea: { id: string; title: string; description: string; impact: string; lead: string },
  by: OperatorName
): DevTask {
  const tasks = tasksStore.get();
  const existing = tasks.find((t) => t.ideaId === idea.id);
  if (existing) return existing;
  const now = new Date();
  const due = new Date(now.getTime() + 7 * 24 * 3_600_000);
  const assignee = normalizeOperator(idea.lead) ?? by;
  const task: DevTask = {
    id: nextTaskId(tasks),
    title: idea.title,
    description: idea.description,
    repo: "twoffactor/web",
    branch: "",
    assignee,
    status: "Por Hacer",
    priority: idea.impact === "Alto" ? "P1" : idea.impact === "Medio" ? "P2" : "P3",
    storyPoints: 3,
    createdAt: todayStamp(now),
    startDate: nowStamp(now),
    dueDateTime: nowStamp(due),
    ideaId: idea.id,
    history: [auditLog(by, "Tarea creada desde la idea {idea} de Cultivo", { idea: idea.id })],
  };
  tasksStore.set((list) => [task, ...list]);
  return task;
}
