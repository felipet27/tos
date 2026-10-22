"use client";

import { FormEvent, useState } from "react";
import { tr } from "@/i18n/translate";
import { Modal } from "../ui/Modal";
import { Button, Field, inputClass } from "../ui/kit";
import { OperatorName } from "../data/operators";

export interface EditField {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
  required?: boolean;
  type?: "text" | "url" | "email";
  placeholder?: string;
  options?: { value: string; label: string }[];
}

// Small form dialog used to edit notes, repositories, sub-phases and writings
export function EditFieldsModal({
  title,
  fields,
  onSave,
  onClose,
  saveLabel,
}: {
  title: string;
  fields: EditField[];
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
  saveLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const formId = `edit-${title.replace(/\W+/g, "-")}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    if (fields.some((f) => f.required && !trimmed[f.name])) return;
    onSave(trimmed);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      icon="✏️"
      size="md"
      dismissible={false}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancelar")}</Button>
          <Button type="submit" form={formId} variant="brass">
            {saveLabel ?? tr("Guardar cambios")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-3">
        {fields.map((f, i) => (
          <Field key={f.name} label={f.label + (f.required ? " *" : "")}>
            {f.options ? (
              <select
                value={values[f.name]}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className={inputClass}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.multiline ? (
              <textarea
                rows={5}
                required={f.required}
                data-autofocus={i === 0 ? true : undefined}
                value={values[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className={inputClass}
              />
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required}
                data-autofocus={i === 0 ? true : undefined}
                value={values[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className={inputClass}
              />
            )}
          </Field>
        ))}
      </form>
    </Modal>
  );
}

export function AuthorDot({ name }: { name: OperatorName }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        name === "Felipe" ? "bg-(color:--tf-22C55E-fosforo)" : "bg-(color:--tf-E5A93C-laton)"
      }`}
    />
  );
}

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
