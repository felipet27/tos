"use client";

import { FormEvent, useState } from "react";
import { tr, trv } from "@/i18n/translate";
import {
  DevTask,
  REPOS,
  RepoName,
  Sprint,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
  auditLog,
  changeTaskStatus,
  isCommitSha,
  nextTaskId,
  tasksStore,
} from "../data/tasks";
import { OPERATORS, OperatorName, partnerOf } from "../data/operators";
import { useClients } from "../data/clients";
import { nowStamp, parseStamp, toDateTimeInput, todayStamp } from "../data/time";
import { useFeedback } from "../ui/feedback";
import { Modal } from "../ui/Modal";
import { DateTimePicker } from "../ui/DateTimePicker";
import { Button, Field, cx, inputClass, subPanelClass } from "../ui/kit";

const POINTS = [1, 2, 3, 5, 8];
const POINT_LABELS: Record<number, string> = { 1: "1 SP (Trivial)", 2: "2 SP (Pequeña)", 3: "3 SP (Mediana)", 5: "5 SP (Compleja)", 8: "8 SP (Épica)" };

export const PRIORITY_LABELS: Record<TaskPriority, string> = { P1: "P1 - Crítico", P2: "P2 - Alto", P3: "P3 - Normal" };
export const ASSIGNEE_LABELS: Record<OperatorName, string> = { Felipe: "Felipe (Producto & Frontend)", "Juan Pablo": "Juan Pablo (Backend & Seguridad)" };

function inputDate(stamp?: string) {
  return stamp ? stamp.replace(" ", "T").slice(0, 16) : "";
}

// Create a task, or edit one (with its history, the status gate and deletion)
export function TaskFormModal({
  task,
  tasks,
  sprints,
  defaultSprintId,
  defaultStatus,
  me,
  onClose,
}: {
  task?: DevTask;
  tasks: DevTask[];
  sprints: Sprint[];
  defaultSprintId?: string;
  defaultStatus?: TaskStatus;
  me: OperatorName;
  onClose: () => void;
}) {
  const { toast, confirm } = useFeedback();
  const clients = useClients().filter((c) => !c.archived);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [repo, setRepo] = useState<RepoName>(task?.repo ?? "twoffactor/web");
  const [branch, setBranch] = useState(task?.branch ?? "feature/");
  const [commit, setCommit] = useState(task?.commitSha ?? "");
  const [assignee, setAssignee] = useState<OperatorName>(task?.assignee ?? me);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "P2");
  const [points, setPoints] = useState(task?.storyPoints ?? 3);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? (defaultStatus === "Desplegado" ? "Por Hacer" : defaultStatus ?? "Por Hacer"));
  const [sprintId, setSprintId] = useState(task ? task.sprintId ?? "" : defaultSprintId ?? "");
  const [clientId, setClientId] = useState(task?.clientId ?? "");
  const [start, setStart] = useState(() => (task ? inputDate(task.startDate) : toDateTimeInput(new Date())));
  const [due, setDue] = useState(() => (task ? inputDate(task.dueDateTime) : toDateTimeInput(new Date(Date.now() + 24 * 3_600_000))));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const formId = task ? `form-task-${task.id}` : "form-task-new";
  const openSprints = sprints.filter((s) => s.status !== "cerrado" || s.id === task?.sprintId);

  function preset(hours: number) {
    const base = parseStamp(start);
    if (Number.isNaN(base)) return;
    setDue(toDateTimeInput(new Date(base + hours * 3_600_000)));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!due) {
      setError(tr("La fecha y hora límite es obligatoria."));
      return;
    }
    if (parseStamp(due) <= parseStamp(start)) {
      setError(tr("La hora límite debe ser posterior a la fecha de inicio."));
      return;
    }
    if (commit.trim() && !isCommitSha(commit)) {
      setError(tr("El commit debe ser un SHA de Git (6 a 40 caracteres hexadecimales)."));
      return;
    }
    const startStamp = start.replace("T", " ");
    const dueStamp = due.replace("T", " ");

    if (!task) {
      const id = nextTaskId(tasks);
      let created: DevTask = {
        id,
        title: title.trim(),
        description: description.trim(),
        repo,
        branch: branch.trim(),
        assignee,
        status: "Por Hacer",
        priority,
        storyPoints: points,
        createdAt: todayStamp(),
        startDate: startStamp,
        dueDateTime: dueStamp,
        sprintId: sprintId || undefined,
        clientId: clientId || undefined,
        history: [auditLog(me, "Tarea creada y asignada a {name}", { name: assignee })],
      };
      if (status !== "Por Hacer") {
        const moved = changeTaskStatus(created, status, me, "Columna elegida al crearla");
        if (moved.ok) created = moved.task;
      }
      tasksStore.set((list) => [created, ...list]);
      toast(tr("Tarea {id} creada", { id }) + (status === "En Revisión" ? ` · ${tr("pendiente del visto bueno de {name}", { name: partnerOf(assignee) })}` : ""));
      onClose();
      return;
    }

    const changes: string[] = [];
    if (title.trim() !== task.title) changes.push("título");
    if (description.trim() !== task.description) changes.push("descripción");
    if (priority !== task.priority) changes.push("prioridad");
    if (assignee !== task.assignee) changes.push("responsable");
    if (repo !== task.repo || branch.trim() !== task.branch) changes.push("repositorio/rama");
    if ((commit.trim() || undefined) !== task.commitSha) changes.push("commit");
    if (points !== task.storyPoints) changes.push("story points");
    if (startStamp !== task.startDate || dueStamp !== task.dueDateTime) changes.push("fechas");
    if ((sprintId || undefined) !== task.sprintId) changes.push("sprint");
    if ((clientId || undefined) !== task.clientId) changes.push("cliente");

    let next: DevTask = {
      ...task,
      title: title.trim(),
      description: description.trim(),
      repo,
      branch: branch.trim(),
      commitSha: commit.trim() || undefined,
      assignee,
      priority,
      storyPoints: points,
      startDate: startStamp,
      dueDateTime: dueStamp,
      sprintId: sprintId || undefined,
      clientId: clientId || undefined,
    };
    if (changes.length || reason.trim()) {
      next = { ...next, history: [auditLog(me, changes.length ? "Campos editados: {fields}" : "Nota de seguimiento", changes.length ? { fields: changes.join(", ") } : undefined, reason.trim() || undefined), ...next.history] };
    }
    if (status !== task.status) {
      const moved = changeTaskStatus(next, status, me, reason.trim() || "Cambio desde el formulario de edición");
      if (!moved.ok) {
        setError(tr(moved.reason, moved.vars));
        return;
      }
      next = moved.task;
    }
    tasksStore.set((list) => list.map((t) => (t.id === task.id ? next : t)));
    toast(tr("{id} actualizada", { id: task.id }));
    onClose();
  }

  async function remove() {
    if (!task) return;
    const ok = await confirm({ title: tr("¿Eliminar la tarea {id}?", { id: task.id }), message: tr(task.title), confirmLabel: tr("Eliminar"), tone: "danger" });
    if (!ok) return;
    tasksStore.set((list) => list.filter((t) => t.id !== task.id));
    toast(tr("Tarea {id} eliminada", { id: task.id }));
    onClose();
  }

  function duplicate() {
    if (!task) return;
    const partner = partnerOf(task.assignee);
    tasksStore.set((list) => {
      const id = nextTaskId(list);
      const copy: DevTask = {
        ...task,
        id,
        assignee: partner,
        status: "Por Hacer",
        commitSha: undefined,
        completedAt: undefined,
        review: undefined,
        createdAt: todayStamp(),
        startDate: nowStamp(),
        history: [auditLog(me, "Copiada desde {id}", { id: task.id })],
      };
      return [copy, ...list];
    });
    toast(tr("Tarea copiada y asignada a {name}", { name: partner }));
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      size="lg"
      tone={task ? "cian" : "fosforo"}
      icon={task ? "✏️" : "⚡"}
      title={task ? tr("Tarea {id}", { id: task.id }) : tr("Nueva tarea de ingeniería")}
      subtitle={task ? tr("Los cambios quedan firmados por {name}", { name: me }) : tr("Consecutivo asignado: {id}", { id: nextTaskId(tasks) })}
      footer={
        <>
          {task && (
            <Button size="sm" variant="danger" className="mr-auto" onClick={remove}>
              🗑 {tr("Eliminar")}
            </Button>
          )}
          {task && (
            <Button size="sm" variant="cian" onClick={duplicate}>
              ⎘ {tr("Copiar a {name}", { name: partnerOf(assignee) })}
            </Button>
          )}
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant="primary">
            {task ? tr("Guardar cambios") : tr("Crear tarea")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-3">
        {error && (
          <p role="alert" className="rounded-lg border border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/40 p-2.5 text-(color:--tf-red-300)">
            {error}
          </p>
        )}
        <Field label={tr("Título *")}>
          <input data-autofocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Ej: Implementar firma biométrica en SDK TypeScript")} className={inputClass} />
        </Field>
        <Field label={tr("Criterio de aceptación / descripción")}>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tr("Detalles técnicos, endpoints o tests requeridos...")} className={inputClass} />
        </Field>

        <div className={cx(subPanelClass, "space-y-3 p-3")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={tr("Inicio")}>
              <DateTimePicker value={start} onChange={(v) => { setStart(v); setError(null); }} />
            </Field>
            <Field label={tr("Hora límite *")}>
              <DateTimePicker value={due} onChange={(v) => { setDue(v); setError(null); }} min={start} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-(color:--tf-94A3B8-niebla)">{tr("Atajos desde el inicio:")}</span>
            {[4, 12, 24, 72].map((h) => (
              <Button key={h} size="xs" onClick={() => preset(h)}>
                +{h >= 24 ? `${h / 24}d` : `${h}h`}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={tr("Estado")} hint={status === "Desplegado" && task?.review?.status !== "aprobado" ? tr("Requiere el visto bueno de {name}", { name: partnerOf(assignee) }) : undefined}>
            <select value={status} onChange={(e) => { setStatus(e.target.value as TaskStatus); setError(null); }} className={inputClass}>
              {TASK_STATUSES.filter((s) => task || s !== "Desplegado").map((s) => (
                <option key={s} value={s}>
                  {tr(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Responsable")}>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value as OperatorName)} className={inputClass}>
              {OPERATORS.map((o) => (
                <option key={o} value={o}>
                  {tr(ASSIGNEE_LABELS[o])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Sprint")}>
            <select value={sprintId} onChange={(e) => setSprintId(e.target.value)} className={inputClass}>
              <option value="">{tr("Backlog (sin sprint)")}</option>
              {openSprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {tr(s.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Cliente")} className="sm:col-span-3">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
              <option value="">{tr("Sin cliente asociado")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Prioridad")}>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputClass}>
              {(["P1", "P2", "P3"] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {tr(PRIORITY_LABELS[p])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Story points")}>
            <select value={points} onChange={(e) => setPoints(Number(e.target.value))} className={inputClass}>
              {POINTS.map((p) => (
                <option key={p} value={p}>
                  {tr(POINT_LABELS[p])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Repositorio")}>
            <select value={repo} onChange={(e) => setRepo(e.target.value as RepoName)} className={inputClass}>
              {REPOS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tr("Rama Git")} className="sm:col-span-2">
            <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="feature/..." className={cx(inputClass, "font-mono")} />
          </Field>
          <Field label={tr("Commit (SHA)")} hint={tr("Opcional: enlaza al commit en GitHub")}>
            <input value={commit} onChange={(e) => { setCommit(e.target.value); setError(null); }} placeholder="a831f0e" className={cx(inputClass, "font-mono")} />
          </Field>
        </div>

        {task && (
          <>
            <Field label={tr("Motivo del cambio (opcional)")}>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr("Ej: Actualización de alcance según QA...")} className={inputClass} />
            </Field>
            <div className={cx(subPanelClass, "max-h-48 space-y-1.5 overflow-y-auto p-3")}>
              <span className="block text-[10px] font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("Historial ({n})", { n: task.history.length })}</span>
              {task.history.map((log) => (
                <div key={log.id} className="rounded border border-(color:--tf-B87333-cobre)/15 bg-(color:--tf-121626) p-1.5 text-[11px]">
                  <div className="flex justify-between text-(color:--tf-94A3B8-niebla)">
                    <b className="text-(color:--tf-white)">{log.modifiedBy}</b>
                    <span className="font-mono text-[10px]">{log.timestamp}</span>
                  </div>
                  <div className="text-(color:--tf-22C55E-fosforo)">{trv(log.action, log.vars)}</div>
                  {log.details && <div className="italic text-(color:--tf-C0C0C0-plata)">{tr(log.details)}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
