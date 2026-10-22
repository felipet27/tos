"use client";

import { createLocalStore, nextSequentialId, useLocalStore } from "./store";
import { OperatorName, normalizeOperator } from "./operators";
import { todayStamp } from "./time";
import { AuditLog, auditLog, createTaskFromIdea } from "./tasks";
import { SEED_IDEAS } from "./seedIdeas";

export type IdeaStage = "semilla" | "crecimiento" | "cosecha";
export type IdeaImpact = "Alto" | "Medio" | "Exploratorio";
export type IdeaLead = OperatorName | "Ambos";

export const IDEA_STAGES: IdeaStage[] = ["semilla", "crecimiento", "cosecha"];
export const IDEA_IMPACTS: IdeaImpact[] = ["Alto", "Medio", "Exploratorio"];
export const IDEA_LEADS: IdeaLead[] = ["Felipe", "Juan Pablo", "Ambos"];

export const IDEA_STAGE_LABELS: Record<IdeaStage, string> = {
  semilla: "1. Semillas (Brotes)",
  crecimiento: "2. En Crecimiento",
  cosecha: "3. Cosecha (Lista para Taller)",
};

export interface IdeaItem {
  id: string;
  title: string;
  description: string;
  lead: IdeaLead;
  stage: IdeaStage;
  impact: IdeaImpact;
  tags: string[];
  createdAt: string;
  archived: boolean;
  taskId?: string;
  history: AuditLog[];
}

export type RawIdea = Partial<Omit<IdeaItem, "lead">> & { author?: string; lead?: string };

function sanitizeIdea(raw: RawIdea): IdeaItem {
  const legacy = (raw.id ?? "").match(/^IDEA-(\d+)$/i);
  const id = legacy ? `IDEA-TFF-${legacy[1].padStart(2, "0")}` : raw.id ?? "IDEA-TFF-00";
  const leadRaw = raw.lead ?? raw.author ?? "";
  const lead: IdeaLead = leadRaw === "Ambos" ? "Ambos" : normalizeOperator(leadRaw) ?? "Felipe";
  const history = Array.isArray(raw.history) && raw.history.length > 0
    ? raw.history.map((h) => ({ ...h, modifiedBy: normalizeOperator(h.modifiedBy) ?? h.modifiedBy }))
    : [{ id: `log-init-${id}`, modifiedBy: lead === "Ambos" ? "Felipe" : lead, timestamp: raw.createdAt ?? todayStamp(), action: "Registro inicial en Cultivo" }];
  return {
    id,
    title: raw.title ?? "",
    description: raw.description ?? "",
    lead,
    stage: IDEA_STAGES.includes(raw.stage as IdeaStage) ? (raw.stage as IdeaStage) : "semilla",
    impact: IDEA_IMPACTS.includes(raw.impact as IdeaImpact) ? (raw.impact as IdeaImpact) : "Medio",
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string" && t.trim()) : [],
    createdAt: raw.createdAt ?? todayStamp(),
    archived: raw.archived === true,
    taskId: raw.taskId,
    history,
  };
}

export const ideasStore = createLocalStore<IdeaItem[]>(
  "twoffactor_cultivo_ideas_v5",
  () => {
    try {
      const legacy = localStorage.getItem("twoffactor_cultivo_ideas_v4");
      const parsed: unknown = legacy ? JSON.parse(legacy) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(sanitizeIdea);
    } catch {
      // No legacy data
    }
    return SEED_IDEAS.map(sanitizeIdea);
  },
  (raw) => (Array.isArray(raw) ? raw.map((i: RawIdea) => sanitizeIdea(i)) : null)
);

export function useIdeas() {
  return useLocalStore(ideasStore);
}

export function nextIdeaId(ideas: IdeaItem[]): string {
  return nextSequentialId("IDEA-TFF-", ideas.map((i) => i.id), 2);
}

export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((t) => t.trim())
    .filter((t) => {
      const key = t.toLowerCase();
      if (!t || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

// Moves an idea between stages; reaching "cosecha" creates (once) its linked Taller task
export function moveIdea(ideaId: string, target: IdeaStage, by: OperatorName, how: string): { taskId?: string; created: boolean } {
  const idea = ideasStore.get().find((i) => i.id === ideaId);
  if (!idea || idea.stage === target) return { created: false };

  let taskId = idea.taskId;
  let created = false;
  if (target === "cosecha" && !taskId) {
    const task = createTaskFromIdea(idea, by);
    taskId = task.id;
    created = true;
  }

  const log = auditLog(by, "Etapa cambiada de '{from}' a '{to}'", { from: IDEA_STAGE_LABELS[idea.stage], to: IDEA_STAGE_LABELS[target] }, how);
  const extra = created ? [auditLog(by, "Tarea {task} creada en Taller", { task: taskId ?? "" })] : [];
  ideasStore.set((list) =>
    list.map((i) => (i.id === ideaId ? { ...i, stage: target, taskId, history: [...extra, log, ...i.history] } : i))
  );
  return { taskId, created };
}
