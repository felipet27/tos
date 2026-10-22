"use client";

import { FormEvent, useState } from "react";
import { tr } from "@/i18n/translate";
import { Sprint, activeSprint, nextSprintId, sprintsStore } from "../data/tasks";
import { todayStamp } from "../data/time";
import { useFeedback } from "../ui/feedback";
import { Modal } from "../ui/Modal";
import { Button, Field, inputClass } from "../ui/kit";

// Create or edit a sprint (name, goal and dates)
export function SprintModal({ sprint, sprints, onClose, onSaved }: { sprint?: Sprint; sprints: Sprint[]; onClose: () => void; onSaved: (id: string) => void }) {
  const { toast } = useFeedback();
  const today = new Date();
  const twoWeeks = new Date(today.getTime() + 13 * 24 * 3_600_000);
  const [name, setName] = useState(sprint?.name ?? tr("Sprint {n}", { n: sprints.length + 1 }));
  const [goal, setGoal] = useState(sprint?.goal ?? "");
  const [start, setStart] = useState(sprint?.start ?? todayStamp(today));
  const [end, setEnd] = useState(sprint?.end ?? todayStamp(twoWeeks));
  const [error, setError] = useState<string | null>(null);
  const hasActive = !!activeSprint(sprints);
  const formId = sprint ? `sprint-${sprint.id}` : "sprint-new";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (end < start) {
      setError(tr("La fecha de fin debe ser igual o posterior a la de inicio."));
      return;
    }
    if (sprint) {
      sprintsStore.set((list) => list.map((s) => (s.id === sprint.id ? { ...s, name: name.trim(), goal: goal.trim(), start, end } : s)));
      toast(tr("Sprint actualizado"));
      onSaved(sprint.id);
    } else {
      const created: Sprint = { id: nextSprintId(sprints), name: name.trim(), goal: goal.trim(), start, end, status: hasActive ? "planificado" : "activo" };
      sprintsStore.set((list) => [...list, created]);
      toast(created.status === "activo" ? tr("{name} creado y activo", { name: created.name }) : tr("{name} creado como planificado", { name: created.name }));
      onSaved(created.id);
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={false}
      icon="🏁"
      title={sprint ? tr("Editar sprint") : tr("Nuevo sprint")}
      subtitle={!sprint && hasActive ? tr("Ya hay un sprint activo: este quedará planificado hasta que cierres el actual.") : undefined}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant="primary">
            {tr("Guardar")}
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
        <Field label={tr("Nombre *")}>
          <input data-autofocus required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label={tr("Objetivo del sprint")}>
          <textarea rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={tr("¿Qué debe quedar listo al final?")} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("Inicio")}>
            <input type="date" required value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </Field>
          <Field label={tr("Fin")}>
            <input type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
