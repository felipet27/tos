"use client";

import { useMemo } from "react";
import { ClientRecord, ReviewEvent, StageValidation, ValidationStatus, useClients } from "./clients";
import { DevTask, useTasks } from "./tasks";
import { OperatorName, partnerOf } from "./operators";

// One row of the Observatorio queue: a client stage or a Taller task waiting for the partner
export interface ReviewItem {
  key: string;
  kind: "etapa" | "tarea";
  status: ValidationStatus;
  author: OperatorName;
  reviewer: OperatorName;
  requestedAt: string;
  summary: string;
  note?: string;
  reviewedBy?: OperatorName | null;
  reviewedAt?: string | null;
  history: ReviewEvent[];
  // Stage reviews
  client?: ClientRecord;
  validation?: StageValidation;
  // Task reviews
  task?: DevTask;
  title: string;
  subtitle: string;
  badge: string;
}

export function collectReviewItems(clients: ClientRecord[], tasks: DevTask[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  clients
    .filter((c) => !c.archived)
    .forEach((client) => {
      client.stageValidations.forEach((v) => {
        items.push({
          key: `etapa-${client.id}-${v.stageId}`,
          kind: "etapa",
          status: v.status,
          author: v.author,
          reviewer: partnerOf(v.author),
          requestedAt: v.completedAt,
          summary: v.activitySummary,
          note: v.validationNote,
          reviewedBy: v.validatedBy,
          reviewedAt: v.validatedAt,
          history: v.reviewHistory ?? [],
          client,
          validation: v,
          title: client.name,
          subtitle: `${client.id} • ${client.industry}`,
          badge: v.sigla,
        });
      });
    });
  tasks.forEach((task) => {
    if (!task.review) return;
    items.push({
      key: `tarea-${task.id}`,
      kind: "tarea",
      status: task.review.status,
      author: task.review.author,
      reviewer: partnerOf(task.review.author),
      requestedAt: task.review.requestedAt,
      summary: task.title,
      note: task.review.note,
      reviewedBy: task.review.reviewedBy ?? null,
      reviewedAt: task.review.reviewedAt ?? null,
      history: task.review.history,
      task,
      title: task.title,
      subtitle: `${task.id} • ${task.repo}`,
      badge: "QA",
    });
  });
  return items.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

export function needsMyReview(item: ReviewItem, me: OperatorName) {
  return item.status === "pendiente" && item.author !== me;
}

export function changesRequestedToMe(item: ReviewItem, me: OperatorName) {
  return item.status === "cambios" && item.author === me;
}

export function useReviewItems(): ReviewItem[] {
  const clients = useClients();
  const tasks = useTasks();
  return useMemo(() => collectReviewItems(clients, tasks), [clients, tasks]);
}

// Everything waiting on this operator: partner work to sign and own work sent back
export function useActionCount(me: OperatorName): number {
  const items = useReviewItems();
  return items.filter((i) => needsMyReview(i, me) || changesRequestedToMe(i, me)).length;
}
