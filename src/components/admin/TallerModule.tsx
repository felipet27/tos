"use client";

import { useEffect, useState } from "react";
import { tr, trv } from "@/i18n/translate";
import {
  DevTask,
  REPOS,
  Sprint,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
  activeSprint,
  auditLog,
  changeTaskStatus,
  getTaskTimeMetrics,
  githubBranchUrl,
  githubCommitUrl,
  githubRepoUrl,
  sprintsStore,
  tasksStore,
  useSprints,
  useTasks,
} from "./data/tasks";
import { OPERATORS, OPERATOR_INITIALS, OperatorName, partnerOf } from "./data/operators";
import { daysBetween, nowStamp, parseStamp, useNow } from "./data/time";
import { navigate } from "./nav";
import { useSession } from "./session";
import { useFeedback } from "./ui/feedback";
import { Badge, Button, Chip, EmptyState, IconButton, ModuleHeader, cx, inputClass, matchesQuery, panelClass, subPanelClass } from "./ui/kit";
import { PRIORITY_LABELS, TaskFormModal } from "./taller/TaskFormModal";
import { SprintModal } from "./taller/SprintModal";
import { Architecture } from "./taller/Architecture";

const COLUMNS: { status: TaskStatus; label: string; icon: string; tone: string }[] = [
  { status: "Por Hacer", label: "Por Hacer", icon: "📥", tone: "text-(color:--tf-94A3B8-niebla)" },
  { status: "En Progreso", label: "En Progreso", icon: "⚡", tone: "text-(color:--tf-E5A93C-laton)" },
  { status: "En Revisión", label: "En Revisión (QA 2FA)", icon: "🔍", tone: "text-(color:--tf-22D3EE-cian)" },
  { status: "Desplegado", label: "Desplegado", icon: "✓", tone: "text-(color:--tf-22C55E-fosforo)" },
];

const PRIORITY_TONE: Record<TaskPriority, "danger" | "laton" | "cian"> = { P1: "danger", P2: "laton", P3: "cian" };

export function TallerModule({ sub }: { sub?: string }) {
  const area = sub === "arquitectura" ? "arquitectura" : "desarrollo";
  return (
    <div className="flex flex-col gap-3 pb-6">
      <ModuleHeader
        title={tr("TALLER // INGENIERÍA, SPRINTS & ARQUITECTURA")}
        subtitle={tr("Sprints con backlog, revisión cruzada antes de desplegar y registro de decisiones.")}
        actions={
          <div className="flex gap-1 rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-07090F-panel) p-1">
            <Chip active={area === "desarrollo"} onClick={() => navigate("taller")}>
              💻 {tr("Sprint")}
            </Chip>
            <Chip active={area === "arquitectura"} tone="laton" onClick={() => navigate("taller", "arquitectura")}>
              🏛 {tr("Arquitectura")}
            </Chip>
          </div>
        }
      />
      {area === "arquitectura" ? <Architecture /> : <Development key={sub ?? ""} sub={sub} />}
    </div>
  );
}

// ------------------------------------------------------------------ sprint work

type View = "kanban" | "lista" | "carga";

function Development({ sub }: { sub?: string }) {
  const { me } = useSession();
  const { toast, confirm } = useFeedback();
  const tasks = useTasks();
  const sprints = useSprints();
  const now = useNow();

  const focusId = sub && sub !== "backlog" ? sub.toUpperCase() : undefined;
  const focused = focusId ? tasks.find((t) => t.id === focusId) : undefined;
  const sprintIds = new Set(sprints.filter((s) => s.status !== "cerrado").map((s) => s.id));
  const inBacklog = (t: DevTask) => !t.sprintId || !sprints.some((s) => s.id === t.sprintId);

  const [scope, setScope] = useState<string>(() => {
    if (focused) return focused.sprintId && sprints.some((s) => s.id === focused.sprintId) ? focused.sprintId : "backlog";
    if (sub === "backlog") return "backlog";
    return activeSprint(sprints)?.id ?? "backlog";
  });
  const [view, setView] = useState<View>("kanban");
  const [assignee, setAssignee] = useState<"todos" | OperatorName>("todos");
  const [priority, setPriority] = useState<"todos" | TaskPriority>("todos");
  const [repo, setRepo] = useState("todos");
  const [query, setQuery] = useState("");
  const [mobileColumn, setMobileColumn] = useState<TaskStatus>(focused?.status ?? "En Progreso");
  const [form, setForm] = useState<{ task?: DevTask; status?: TaskStatus } | null>(null);
  const [sprintForm, setSprintForm] = useState<Sprint | "new" | null>(null);

  const sprint = sprints.find((s) => s.id === scope);
  const scopeTasks = tasks.filter((t) => (scope === "backlog" ? inBacklog(t) : t.sprintId === scope));
  const filtered = scopeTasks.filter(
    (t) =>
      (assignee === "todos" || t.assignee === assignee) &&
      (priority === "todos" || t.priority === priority) &&
      (repo === "todos" || t.repo === repo) &&
      matchesQuery(query, t.id, t.title, t.description, t.repo, t.branch)
  );

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`task-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);

  function move(task: DevTask, target: TaskStatus, how: string) {
    const result = changeTaskStatus(task, target, me, how);
    if (!result.ok) {
      toast(tr(result.reason, result.vars), "warn");
      return;
    }
    tasksStore.set((list) => list.map((t) => (t.id === task.id ? result.task : t)));
    toast(
      target === "En Revisión"
        ? tr("{id} enviada a QA: {name} debe dar el visto bueno en Observatorio", { id: task.id, name: partnerOf(task.assignee) })
        : tr("{id} movida a {status}", { id: task.id, status: tr(target) })
    );
  }

  async function remove(task: DevTask) {
    if (!(await confirm({ title: tr("¿Eliminar la tarea {id}?", { id: task.id }), message: tr(task.title), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    tasksStore.set((list) => list.filter((t) => t.id !== task.id));
    toast(tr("Tarea {id} eliminada", { id: task.id }));
  }

  function assignToSprint(task: DevTask, sprintId: string) {
    const target = sprints.find((s) => s.id === sprintId);
    tasksStore.set((list) =>
      list.map((t) =>
        t.id === task.id
          ? { ...t, sprintId: sprintId || undefined, history: [auditLog(me, sprintId ? "Asignada al sprint {sprint}" : "Devuelta al backlog", target ? { sprint: target.name } : undefined), ...t.history] }
          : t
      )
    );
    toast(sprintId ? tr("{id} asignada a {sprint}", { id: task.id, sprint: target?.name ?? "" }) : tr("{id} devuelta al backlog", { id: task.id }));
  }

  async function closeSprint(s: Sprint) {
    const pending = tasks.filter((t) => t.sprintId === s.id && t.status !== "Desplegado");
    const ok = await confirm({
      title: tr("¿Cerrar {sprint}?", { sprint: s.name }),
      message: pending.length
        ? tr("{n} tarea(s) sin desplegar volverán al backlog: {ids}.", { n: pending.length, ids: pending.map((t) => t.id).join(", ") })
        : tr("Todas las tareas del sprint están desplegadas."),
      confirmLabel: tr("Cerrar sprint"),
    });
    if (!ok) return;
    sprintsStore.set((list) => list.map((x) => (x.id === s.id ? { ...x, status: "cerrado", closedAt: nowStamp() } : x)));
    if (pending.length) {
      const ids = new Set(pending.map((t) => t.id));
      tasksStore.set((list) =>
        list.map((t) => (ids.has(t.id) ? { ...t, sprintId: undefined, history: [auditLog(me, "Devuelta al backlog al cerrar {sprint}", { sprint: s.name }), ...t.history] } : t))
      );
    }
    const next = sprints.find((x) => x.status === "planificado");
    setScope(next?.id ?? "backlog");
    toast(tr("{sprint} cerrado", { sprint: s.name }));
  }

  function activate(s: Sprint) {
    sprintsStore.set((list) => list.map((x) => (x.id === s.id ? { ...x, status: "activo" } : x)));
    toast(tr("{sprint} activo", { sprint: s.name }));
  }

  async function resetDemo() {
    const ok = await confirm({ title: tr("¿Restablecer los datos de demostración de Taller?"), message: tr("Solo disponible en desarrollo. Borra tareas, sprints y ADRs de este navegador."), confirmLabel: tr("Restablecer"), tone: "danger" });
    if (!ok) return;
    ["twoffactor_taller_tasks_v7", "twoffactor_taller_sprints_v1", "twoffactor_taller_adrs_v1"].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  // ---- metrics of the current scope
  const total = scopeTasks.length;
  const done = scopeTasks.filter((t) => t.status === "Desplegado").length;
  const inExecution = scopeTasks.filter((t) => t.status === "En Progreso" || t.status === "En Revisión").length;
  const points = scopeTasks.reduce((acc, t) => acc + t.storyPoints, 0);
  const pointsDone = scopeTasks.filter((t) => t.status === "Desplegado").reduce((acc, t) => acc + t.storyPoints, 0);
  const delayed = scopeTasks.filter((t) => getTaskTimeMetrics(t, now).status === "retrasada");
  const warning = scopeTasks.filter((t) => getTaskTimeMetrics(t, now).status === "por_vencer");
  const daysLeft = sprint ? daysBetween(now, parseStamp(`${sprint.end} 23:59`)) : null;
  const backlogCount = tasks.filter(inBacklog).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Sprint selector & summary */}
      <section className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label={tr("Sprint")} className={cx(inputClass, "font-bold sm:w-80")}>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {tr(s.name)} · {tr(s.status)} ({tasks.filter((t) => t.sprintId === s.id).length})
              </option>
            ))}
            <option value="backlog">
              {tr("Backlog")} ({backlogCount})
            </option>
          </select>
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            <Button size="sm" variant="primary" onClick={() => setForm({})}>
              + {tr("Tarea")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSprintForm("new")}>
              + {tr("Sprint")}
            </Button>
            {sprint && (
              <Button size="sm" onClick={() => setSprintForm(sprint)}>
                ✏️ {tr("Editar sprint")}
              </Button>
            )}
            {sprint?.status === "activo" && (
              <Button size="sm" variant="warn" onClick={() => closeSprint(sprint)}>
                🏁 {tr("Cerrar sprint")}
              </Button>
            )}
            {sprint?.status === "planificado" && !activeSprint(sprints) && (
              <Button size="sm" variant="warn" onClick={() => activate(sprint)}>
                ▶ {tr("Activar")}
              </Button>
            )}
            {process.env.NODE_ENV !== "production" && (
              <Button size="sm" onClick={resetDemo} title={tr("Solo en desarrollo")}>
                ↻ {tr("Reset demo")}
              </Button>
            )}
          </div>
        </div>

        {sprint ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone={sprint.status === "activo" ? "fosforo" : sprint.status === "planificado" ? "laton" : "muted"}>{tr(sprint.status).toUpperCase()}</Badge>
              <span className="font-mono text-(color:--tf-94A3B8-niebla)">
                {sprint.start} → {sprint.end}
              </span>
              {sprint.status !== "cerrado" && daysLeft !== null && (
                <span className={daysLeft < 0 ? "font-bold text-(color:--tf-red-300)" : "text-(color:--tf-white)"}>
                  {daysLeft < 0 ? tr("Vencido hace {n} día(s)", { n: -daysLeft }) : tr("{n} días restantes", { n: daysLeft })}
                </span>
              )}
            </div>
            {sprint.goal && <p className="text-[11px] italic text-(color:--tf-C0C0C0-plata)">🎯 {tr(sprint.goal)}</p>}
            <div className="space-y-1">
              <div className="flex flex-wrap justify-between gap-2 text-[11px] text-(color:--tf-94A3B8-niebla)">
                <span>
                  {tr("Desplegadas {done}/{total} · en ejecución {exec}", { done, total, exec: inExecution })}
                </span>
                <span className="font-mono font-bold text-(color:--tf-22C55E-fosforo)">
                  {pointsDone}/{points} SP
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/80">
                <div className="h-full bg-(color:--tf-22C55E-fosforo)" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                <div className="h-full bg-(color:--tf-E5A93C-laton)" style={{ width: `${total ? (inExecution / total) * 100 : 0}%` }} />
              </div>
            </div>
            {(delayed.length > 0 || warning.length > 0) && (
              <p
                className={cx(
                  "rounded-lg border p-2 text-[11px]",
                  delayed.length ? "border-(color:--tf-red-500)/50 bg-(color:--tf-red-950)/40 text-(color:--tf-red-300)" : "border-(color:--tf-E5A93C-laton)/40 bg-(color:--tf-E5A93C-laton)/10 text-(color:--tf-E5A93C-laton)"
                )}
              >
                {delayed.length > 0 && <>🚨 {tr("Retrasadas:")} <b>{delayed.map((t) => t.id).join(", ")}</b>. </>}
                {warning.length > 0 && <>⏳ {tr("Vencen en menos de 12 h:")} <b>{warning.map((t) => t.id).join(", ")}</b>.</>}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("Tareas sin sprint: asígnalas a un sprint cuando vayan a trabajarse. Las ideas aprobadas en Cultivo llegan aquí.")}</p>
        )}
      </section>

      {/* Views & filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {scope !== "backlog" ? (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <Chip active={view === "kanban"} onClick={() => setView("kanban")}>
              📋 {tr("Tablero")}
            </Chip>
            <Chip active={view === "lista"} tone="cian" onClick={() => setView("lista")}>
              📑 {tr("Lista")}
            </Chip>
            <Chip active={view === "carga"} tone="laton" onClick={() => setView("carga")}>
              👥 {tr("Carga por socio")}
            </Chip>
          </div>
        ) : (
          <span className="text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("Backlog ({n})", { n: scopeTasks.length })}</span>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value as OperatorName | "todos")} aria-label={tr("Responsable")} className={cx(inputClass, "sm:w-40")}>
            <option value="todos">{tr("Responsable: todos")}</option>
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | "todos")} aria-label={tr("Prioridad")} className={cx(inputClass, "sm:w-40")}>
            <option value="todos">{tr("Prioridad: todas")}</option>
            {(["P1", "P2", "P3"] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {tr(PRIORITY_LABELS[p])}
              </option>
            ))}
          </select>
          <select value={repo} onChange={(e) => setRepo(e.target.value)} aria-label={tr("Repositorio")} className={cx(inputClass, "sm:w-48")}>
            <option value="todos">{tr("Repositorio: todos")}</option>
            {REPOS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Buscar tareas...")} aria-label={tr("Buscar tareas")} className={cx(inputClass, "sm:w-48")} />
        </div>
      </div>

      {scope === "backlog" ? (
        <BacklogList tasks={filtered} sprints={sprints.filter((s) => sprintIds.has(s.id))} focusId={focusId} onAssign={assignToSprint} onEdit={(t) => setForm({ task: t })} onRemove={remove} />
      ) : view === "kanban" ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:hidden" role="tablist">
            {COLUMNS.map((c) => (
              <Chip key={c.status} active={mobileColumn === c.status} onClick={() => setMobileColumn(c.status)}>
                {c.icon} {tr(c.status)} <span className="opacity-70">{filtered.filter((t) => t.status === c.status).length}</span>
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const list = filtered.filter((t) => t.status === col.status);
              return (
                <KanbanColumn
                  key={col.status}
                  column={col}
                  tasks={list}
                  hiddenOnMobile={mobileColumn !== col.status}
                  focusId={focusId}
                  now={now}
                  onDropTask={(id) => {
                    const task = tasks.find((t) => t.id === id);
                    if (task && task.status !== col.status) move(task, col.status, "Movida arrastrando la tarjeta");
                  }}
                  onMove={move}
                  onEdit={(t) => setForm({ task: t })}
                  onRemove={remove}
                  onAdd={() => setForm({ status: col.status })}
                />
              );
            })}
          </div>
        </>
      ) : view === "lista" ? (
        <TaskList tasks={filtered} now={now} focusId={focusId} onMove={move} onEdit={(t) => setForm({ task: t })} onRemove={remove} />
      ) : (
        <Workload tasks={scopeTasks} />
      )}

      {form && (
        <TaskFormModal
          task={form.task}
          tasks={tasks}
          sprints={sprints}
          defaultSprintId={scope === "backlog" ? undefined : scope}
          defaultStatus={form.status}
          me={me}
          onClose={() => setForm(null)}
        />
      )}
      {sprintForm && (
        <SprintModal sprint={sprintForm === "new" ? undefined : sprintForm} sprints={sprints} onClose={() => setSprintForm(null)} onSaved={(id) => setScope(id)} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ kanban

function KanbanColumn({
  column,
  tasks,
  hiddenOnMobile,
  focusId,
  now,
  onDropTask,
  onMove,
  onEdit,
  onRemove,
  onAdd,
}: {
  column: (typeof COLUMNS)[number];
  tasks: DevTask[];
  hiddenOnMobile: boolean;
  focusId?: string;
  now: number;
  onDropTask: (id: string) => void;
  onMove: (task: DevTask, target: TaskStatus, how: string) => void;
  onEdit: (task: DevTask) => void;
  onRemove: (task: DevTask) => void;
  onAdd: () => void;
}) {
  const [over, setOver] = useState(false);
  const points = tasks.reduce((acc, t) => acc + t.storyPoints, 0);
  return (
    <section
      aria-label={tr(column.label)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropTask(id);
      }}
      className={cx(
        panelClass,
        "flex-col gap-2.5 p-3 md:flex md:min-h-[420px]",
        hiddenOnMobile ? "hidden" : "flex",
        over && "border-(color:--tf-22C55E-fosforo) bg-(color:--tf-22C55E-fosforo)/10 ring-2 ring-(color:--tf-22C55E-fosforo)/50"
      )}
    >
      <div className="flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/20 pb-2">
        <h4 className={cx("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", column.tone)}>
          {column.icon} {tr(column.label)}
        </h4>
        <span className="font-mono text-[10px] text-(color:--tf-94A3B8-niebla)">
          {tasks.length} · {points} SP
        </span>
      </div>
      {tasks.length === 0 && <EmptyState>{tr("Sin tareas aquí")}</EmptyState>}
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} now={now} focused={t.id === focusId} onMove={onMove} onEdit={onEdit} onRemove={onRemove} />
      ))}
      {column.status !== "Desplegado" && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-lg border border-dashed border-(color:--tf-B87333-cobre)/30 py-1.5 text-[11px] font-bold text-(color:--tf-94A3B8-niebla) transition-all hover:border-(color:--tf-22C55E-fosforo) hover:text-(color:--tf-white) pointer-coarse:min-h-11"
        >
          + {tr("Añadir en {column}", { column: tr(column.status) })}
        </button>
      )}
    </section>
  );
}

function ReviewBadge({ task }: { task: DevTask }) {
  const r = task.review;
  if (!r || task.status === "Desplegado") return null;
  if (r.status === "aprobado") return <Badge tone="fosforo">✓ {tr("QA aprobado por {name}: lista para desplegar", { name: r.reviewedBy ?? "" })}</Badge>;
  if (r.status === "cambios") return <Badge tone="danger">↺ {tr("{name} pidió cambios", { name: r.reviewedBy ?? partnerOf(r.author) })}</Badge>;
  return <Badge tone="laton">⏳ {tr("Esperando visto bueno de {name}", { name: partnerOf(r.author) })}</Badge>;
}

function TaskLinks({ task }: { task: DevTask }) {
  const branchUrl = githubBranchUrl(task.repo, task.branch);
  const commitUrl = githubCommitUrl(task.repo, task.commitSha);
  const link = "truncate font-mono text-[10px] hover:underline";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-(color:--tf-B87333-cobre)/15 pt-1">
      <a href={githubRepoUrl(task.repo)} target="_blank" rel="noopener noreferrer" className={cx(link, "text-(color:--tf-22D3EE-cian)")}>
        {task.repo}
      </a>
      {branchUrl && (
        <a href={branchUrl} target="_blank" rel="noopener noreferrer" className={cx(link, "text-(color:--tf-94A3B8-niebla)")}>
          ⎇ {task.branch}
        </a>
      )}
      {commitUrl && (
        <a href={commitUrl} target="_blank" rel="noopener noreferrer" className={cx(link, "text-(color:--tf-E5A93C-laton)")}>
          #{task.commitSha!.slice(0, 7)}
        </a>
      )}
    </div>
  );
}

function TaskCard({
  task,
  now,
  focused,
  onMove,
  onEdit,
  onRemove,
}: {
  task: DevTask;
  now: number;
  focused: boolean;
  onMove: (task: DevTask, target: TaskStatus, how: string) => void;
  onEdit: (task: DevTask) => void;
  onRemove: (task: DevTask) => void;
}) {
  const index = TASK_STATUSES.indexOf(task.status);
  const prev = index > 0 ? TASK_STATUSES[index - 1] : null;
  const next = index < TASK_STATUSES.length - 1 ? TASK_STATUSES[index + 1] : null;
  const metric = getTaskTimeMetrics(task, now);
  const last = task.history[0];
  const blockedDeploy = next === "Desplegado" && task.review?.status !== "aprobado";

  return (
    <article
      id={`task-${task.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cx(
        "space-y-2 rounded-xl border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-0C0E18) p-3 transition-all hover:border-(color:--tf-E5A93C-laton)/70 md:cursor-grab",
        focused && "ring-2 ring-(color:--tf-22C55E-fosforo)"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-(color:--tf-E5A93C-laton)">{task.id}</span>
          <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
          <Badge tone="fosforo">{task.storyPoints} SP</Badge>
        </span>
        <span className="flex items-center gap-1">
          <IconButton label={tr("Editar tarea {id}", { id: task.id })} onClick={() => onEdit(task)}>
            ✏️
          </IconButton>
          <IconButton label={tr("Eliminar tarea {id}", { id: task.id })} tone="danger" onClick={() => onRemove(task)}>
            🗑
          </IconButton>
        </span>
      </div>
      <h5 className="text-xs font-bold leading-snug text-(color:--tf-white)">{tr(task.title)}</h5>
      {task.description && <p className="line-clamp-2 text-[11px] leading-relaxed text-(color:--tf-94A3B8-niebla)">{tr(task.description)}</p>}
      {task.ideaId && (
        <button type="button" onClick={() => navigate("cultivo", task.ideaId)} className="text-[10px] font-bold text-(color:--tf-22D3EE-cian) hover:underline">
          💡 {tr("Viene de la idea {id}", { id: task.ideaId })}
        </button>
      )}
      <ReviewBadge task={task} />
      <TaskLinks task={task} />
      <div className="space-y-1 rounded-lg border border-(color:--tf-B87333-cobre)/25 bg-(color:--tf-black)/50 p-2 text-[10px]">
        <div className="flex justify-between gap-2 font-mono text-(color:--tf-94A3B8-niebla)">
          <span>
            {tr("Inicio:")} <b className="text-(color:--tf-white)">{task.startDate}</b>
          </span>
          <span>
            {tr("Límite:")} <b className="text-(color:--tf-white)">{task.dueDateTime}</b>
          </span>
        </div>
        <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-bold", metric.badgeClass)}>
          {metric.icon} {tr(metric.label, metric.vars)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-(color:--tf-B87333-cobre)/15 pt-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-(color:--tf-white)">
          <span
            className={cx(
              "grid h-5 w-5 place-items-center rounded-full border text-[8px] font-black",
              task.assignee === "Felipe" ? "border-(color:--tf-22C55E-fosforo) text-(color:--tf-22C55E-fosforo)" : "border-(color:--tf-E5A93C-laton) text-(color:--tf-E5A93C-laton)"
            )}
          >
            {OPERATOR_INITIALS[task.assignee]}
          </span>
          {task.assignee}
        </span>
        <span className="flex items-center gap-1">
          {prev && (
            <Button size="xs" aria-label={tr("Regresar a {status}", { status: tr(prev) })} title={tr("Regresar a {status}", { status: tr(prev) })} onClick={() => onMove(task, prev, "Movida con el botón de retroceso")}>
              ◀
            </Button>
          )}
          {next && (
            <Button
              size="xs"
              variant={blockedDeploy ? "ghost" : "primary"}
              title={blockedDeploy ? tr("Requiere el visto bueno de {name}", { name: partnerOf(task.assignee) }) : tr("Avanzar a {status}", { status: tr(next) })}
              onClick={() => onMove(task, next, "Movida con el botón de avance")}
            >
              {next === "En Revisión" ? tr("Enviar a QA") : next === "Desplegado" ? tr("Desplegar") : tr("Avanzar")} ▶
            </Button>
          )}
          {!next && <span className="text-[10px] font-bold text-(color:--tf-22C55E-fosforo)">✓ {tr("DONE")}</span>}
        </span>
      </div>
      {last && (
        <div className="truncate border-t border-(color:--tf-B87333-cobre)/10 pt-1 text-[9px] text-(color:--tf-888888)">
          {last.modifiedBy} — {trv(last.action, last.vars)} · {last.timestamp.slice(0, 10)}
        </div>
      )}
    </article>
  );
}

// ------------------------------------------------------------------ list & workload

function TaskList({
  tasks,
  now,
  focusId,
  onMove,
  onEdit,
  onRemove,
}: {
  tasks: DevTask[];
  now: number;
  focusId?: string;
  onMove: (task: DevTask, target: TaskStatus, how: string) => void;
  onEdit: (task: DevTask) => void;
  onRemove: (task: DevTask) => void;
}) {
  if (tasks.length === 0) return <EmptyState>{tr("No hay tareas para los filtros seleccionados.")}</EmptyState>;
  return (
    <>
      <div className="space-y-2 md:hidden">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} now={now} focused={t.id === focusId} onMove={onMove} onEdit={onEdit} onRemove={onRemove} />
        ))}
      </div>
      <div className={cx(panelClass, "hidden overflow-x-auto md:block")}>
        <table className="w-full text-left text-xs text-(color:--tf-C0C0C0-plata)">
          <thead>
            <tr className="border-b border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)/40 text-[10px] uppercase text-(color:--tf-E5A93C-laton)">
              <th className="px-3 py-2.5">{tr("ID")}</th>
              <th className="px-3 py-2.5">{tr("Tarea")}</th>
              <th className="px-3 py-2.5">{tr("Cronograma")}</th>
              <th className="px-3 py-2.5">{tr("Responsable")}</th>
              <th className="px-3 py-2.5">{tr("Estado")}</th>
              <th className="px-3 py-2.5 text-right">{tr("Acción")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(color:--tf-B87333-cobre)/15">
            {tasks.map((t) => {
              const metric = getTaskTimeMetrics(t, now);
              return (
                <tr key={t.id} id={`task-${t.id}`} className={cx("hover:bg-(color:--tf-121626)", t.id === focusId && "bg-(color:--tf-22C55E-fosforo)/10")}>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="font-mono font-bold text-(color:--tf-E5A93C-laton)">{t.id}</div>
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> <span className="font-mono text-[10px] text-(color:--tf-22C55E-fosforo)">{t.storyPoints} SP</span>
                  </td>
                  <td className="max-w-md px-3 py-2.5">
                    <div className="font-bold text-(color:--tf-white)">{tr(t.title)}</div>
                    <TaskLinks task={t} />
                    <div className="mt-1">
                      <ReviewBadge task={t} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px]">
                    <div>{t.dueDateTime}</div>
                    <span className={cx("mt-1 inline-flex rounded border px-1.5 py-0.5 font-bold", metric.badgeClass)}>
                      {metric.icon} {tr(metric.label, metric.vars)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{t.assignee}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <select value={t.status} onChange={(e) => onMove(t, e.target.value as TaskStatus, "Cambio desde la lista")} aria-label={tr("Estado de {id}", { id: t.id })} className={cx(inputClass, "w-40 py-1")}>
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {tr(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <span className="inline-flex gap-1">
                      <IconButton label={tr("Editar tarea {id}", { id: t.id })} onClick={() => onEdit(t)}>
                        ✏️
                      </IconButton>
                      <IconButton label={tr("Eliminar tarea {id}", { id: t.id })} tone="danger" onClick={() => onRemove(t)}>
                        🗑
                      </IconButton>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BacklogList({
  tasks,
  sprints,
  focusId,
  onAssign,
  onEdit,
  onRemove,
}: {
  tasks: DevTask[];
  sprints: Sprint[];
  focusId?: string;
  onAssign: (task: DevTask, sprintId: string) => void;
  onEdit: (task: DevTask) => void;
  onRemove: (task: DevTask) => void;
}) {
  if (tasks.length === 0) return <EmptyState>{tr("El backlog está vacío.")}</EmptyState>;
  return (
    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {tasks.map((t) => (
        <li key={t.id} id={`task-${t.id}`} className={cx(subPanelClass, "space-y-2 p-3", t.id === focusId && "ring-2 ring-(color:--tf-22C55E-fosforo)")}>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px]">
              <span className="font-mono font-bold text-(color:--tf-E5A93C-laton)">{t.id}</span>
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              <span className="text-(color:--tf-94A3B8-niebla)">
                {t.assignee} · {t.storyPoints} SP · {tr(t.status)}
              </span>
            </span>
            <span className="flex gap-1">
              <IconButton label={tr("Editar tarea {id}", { id: t.id })} onClick={() => onEdit(t)}>
                ✏️
              </IconButton>
              <IconButton label={tr("Eliminar tarea {id}", { id: t.id })} tone="danger" onClick={() => onRemove(t)}>
                🗑
              </IconButton>
            </span>
          </div>
          <div className="text-xs font-bold text-(color:--tf-white)">{tr(t.title)}</div>
          {t.ideaId && (
            <button type="button" onClick={() => navigate("cultivo", t.ideaId)} className="text-[10px] font-bold text-(color:--tf-22D3EE-cian) hover:underline">
              💡 {tr("Viene de la idea {id}", { id: t.ideaId })}
            </button>
          )}
          <select value="" onChange={(e) => e.target.value && onAssign(t, e.target.value)} aria-label={tr("Asignar a un sprint")} className={inputClass} disabled={sprints.length === 0}>
            <option value="">{sprints.length ? tr("Asignar a un sprint…") : tr("Crea un sprint para asignarla")}</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {tr(s.name)} ({tr(s.status)})
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

function Workload({ tasks }: { tasks: DevTask[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {OPERATORS.map((op) => {
        const mine = tasks.filter((t) => t.assignee === op);
        const sp = mine.reduce((acc, t) => acc + t.storyPoints, 0);
        const isFelipe = op === "Felipe";
        return (
          <section key={op} className={cx(panelClass, "space-y-3 p-4", isFelipe ? "border-(color:--tf-22C55E-fosforo)/50" : "border-(color:--tf-E5A93C-laton)/50")}>
            <div className="flex items-center justify-between border-b border-(color:--tf-B87333-cobre)/25 pb-2">
              <h3 className="text-sm font-bold text-(color:--tf-white)">{op === "Felipe" ? "Felipe Tangarife" : "Juan Pablo Hurtado"}</h3>
              <span className={cx("font-mono text-lg font-bold", isFelipe ? "text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-E5A93C-laton)")}>{sp} SP</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                [tr("Tareas"), mine.length],
                [tr("En curso"), mine.filter((t) => t.status === "En Progreso" || t.status === "En Revisión").length],
                [tr("Desplegadas"), mine.filter((t) => t.status === "Desplegado").length],
              ].map(([label, value]) => (
                <div key={label as string} className={cx(subPanelClass, "p-2")}>
                  <span className="block text-[10px] uppercase text-(color:--tf-94A3B8-niebla)">{label}</span>
                  <strong className="text-base text-(color:--tf-white)">{value}</strong>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5">
              {mine.length === 0 && <EmptyState>{tr("Sin tareas asignadas.")}</EmptyState>}
              {mine.map((t) => (
                <li key={t.id} className={cx(subPanelClass, "flex items-center justify-between gap-2 p-2 text-xs")}>
                  <span className="truncate text-(color:--tf-white)">
                    <span className="font-mono text-(color:--tf-E5A93C-laton)">{t.id}</span> {tr(t.title)}
                  </span>
                  <span className="shrink-0 text-[10px] text-(color:--tf-94A3B8-niebla)">{tr(t.status)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
