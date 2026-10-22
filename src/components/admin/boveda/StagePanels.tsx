"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { tr } from "@/i18n/translate";
import {
  ClientRecord,
  GithubRepo,
  LevantamientoNote,
  MarchaBlancaEscrito,
  MarchaBlancaSubStage,
  ProduccionNote,
  ProduccionNoteType,
  ProjectStageId,
  ProposalSlotId,
  StoredFile,
  activity,
  deleteStoredFile,
  fileUrl,
  formatBytes,
  newId,
  updateClient,
  uploadClientFile,
} from "../data/clients";
import { OperatorName, partnerOf } from "../data/operators";
import { getPlan, formatUsd } from "../data/plans";
import { daysBetween, nowStamp, parseStamp, todayStamp } from "../data/time";
import { navigate } from "../nav";
import { useFeedback } from "../ui/feedback";
import { Modal } from "../ui/Modal";
import { Badge, Button, EmptyState, Field, IconButton, SectionTitle, cx, inputClass, panelClass, subPanelClass } from "../ui/kit";
import { AuthorDot, EditFieldsModal, isHttpsUrl } from "./shared";

interface PanelProps {
  client: ClientRecord;
  me: OperatorName;
}

// ------------------------------------------------------------------ stage header

function StageHeader({ client, stageId, title, description, tone = "laton" }: { client: ClientRecord; stageId: ProjectStageId; title: string; description: ReactNode; tone?: "laton" | "fosforo" }) {
  const v = client.stageValidations.find((x) => x.stageId === stageId);
  const reached = stageId <= client.currentStage;
  return (
    <div className={cx(panelClass, "space-y-2 p-3 sm:p-4", tone === "fosforo" && "border-(color:--tf-22C55E-fosforo)/40")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone === "fosforo" ? "fosforo" : "laton"}>{tr("ETAPA {n} DE 5", { n: stageId })}</Badge>
        <h4 className="text-sm font-bold text-(color:--tf-white) sm:text-base">{title}</h4>
      </div>
      <p className="text-xs text-(color:--tf-94A3B8-niebla)">{description}</p>
      {/* Sign-off status of this stage (visible on touch screens too, not only as a tooltip) */}
      <div className="flex flex-wrap items-center gap-2 border-t border-(color:--tf-B87333-cobre)/15 pt-2 text-[11px]">
        {!reached && <Badge>{tr("Etapa aún no alcanzada")}</Badge>}
        {v && (
          <>
            <span className="text-(color:--tf-94A3B8-niebla)">
              {tr("Registrada por")} <strong className="text-(color:--tf-white)">{v.author}</strong> · {v.completedAt}
            </span>
            {v.status === "aprobado" && (
              <Badge tone="fosforo">
                ✓ {tr("Visto bueno de {name}", { name: v.validatedBy ?? "" })} {v.validatedAt ? `· ${v.validatedAt}` : ""}
              </Badge>
            )}
            {v.status === "pendiente" && <Badge tone="laton">⏳ {tr("Pendiente del visto bueno de {name}", { name: partnerOf(v.author) })}</Badge>}
            {v.status === "cambios" && <Badge tone="danger">↺ {tr("{name} pidió cambios", { name: partnerOf(v.author) })}</Badge>}
          </>
        )}
      </div>
      {v?.activitySummary && <p className="text-[11px] italic text-(color:--tf-C0C0C0-plata)">“{tr(v.activitySummary)}”</p>}
      {v?.status === "cambios" && v.validationNote && (
        <p className="rounded-lg border border-(color:--tf-red-500)/40 bg-(color:--tf-red-950)/40 p-2 text-[11px] text-(color:--tf-red-300)">
          <strong>{tr("Comentario del revisor:")}</strong> {v.validationNote}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 1. Levantamiento

export function LevantamientoPanel({ client, me }: PanelProps) {
  const { confirm, toast } = useFeedback();
  const [text, setText] = useState("");
  const [viewing, setViewing] = useState<LevantamientoNote | null>(null);
  const [editing, setEditing] = useState<LevantamientoNote | null>(null);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const note: LevantamientoNote = { id: newId("lev"), author: me, text: text.trim(), date: nowStamp() };
    updateClient(client.id, (c) => ({ ...c, levantamientoNotes: [note, ...c.levantamientoNotes] }));
    setText("");
    toast(tr("Nota guardada"));
  }

  async function remove(note: LevantamientoNote) {
    if (!(await confirm({ title: tr("¿Eliminar esta nota?"), message: note.text.slice(0, 200), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    updateClient(
      client.id,
      (c) => ({ ...c, levantamientoNotes: c.levantamientoNotes.filter((n) => n.id !== note.id) }),
      activity(me, "Nota de levantamiento del {date} eliminada", { date: note.date })
    );
    toast(tr("Nota eliminada"));
  }

  return (
    <div className="space-y-3">
      <StageHeader
        client={client}
        stageId={1}
        title={tr("Levantamiento de Requisitos // Cuaderno Técnico de Información")}
        description={tr("Espacio para apuntar y consultar toda la información que entrega el cliente.")}
      />

      <form onSubmit={add} className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("+ Apuntar Nueva Información del Cliente")}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-(color:--tf-94A3B8-niebla)">
            {tr("Apuntado por:")} <AuthorDot name={me} /> <strong className="text-(color:--tf-white)">{me}</strong>
          </span>
        </div>
        <textarea
          rows={3}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr("Escribe aquí los requerimientos del cliente, arquitectura, integraciones, observaciones de seguridad o acuerdos de reunión...")}
          className={inputClass}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="outline">
            {tr("Guardar Información")}
          </Button>
        </div>
      </form>

      <div className="space-y-2.5">
        <div className="px-1 text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">
          {tr("Registro de información apuntada ({count})", { count: client.levantamientoNotes.length })}
        </div>
        {client.levantamientoNotes.length === 0 ? (
          <EmptyState>{tr("Aún no se ha apuntado información de levantamiento para este cliente. Utiliza el formulario arriba.")}</EmptyState>
        ) : (
          client.levantamientoNotes.map((note) => {
            const isLong = note.text.length > 220 || note.text.split("\n").length > 4;
            const mine = note.author === me;
            return (
              <article key={note.id} className={cx(panelClass, "space-y-2 p-3")}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 font-bold text-(color:--tf-white)">
                    <AuthorDot name={note.author} /> {note.author}
                    <span className="font-mono font-normal text-(color:--tf-64748B)">
                      {note.date}
                      {note.editedAt ? ` · ${tr("editada")}` : ""}
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <IconButton label={tr("Ver nota completa")} onClick={() => setViewing(note)}>
                      ⤢
                    </IconButton>
                    {mine && (
                      <>
                        <IconButton label={tr("Editar nota")} onClick={() => setEditing(note)}>
                          ✏️
                        </IconButton>
                        <IconButton label={tr("Eliminar nota")} tone="danger" onClick={() => remove(note)}>
                          🗑
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
                <p
                  className={cx(
                    "whitespace-pre-line break-words border-l-2 border-(color:--tf-B87333-cobre)/30 pl-3 text-xs leading-relaxed text-(color:--tf-C0C0C0-plata)",
                    isLong && "line-clamp-4"
                  )}
                >
                  {tr(note.text)}
                </p>
                {isLong && (
                  <button type="button" onClick={() => setViewing(note)} className="pl-3 text-[11px] font-bold text-(color:--tf-E5A93C-laton) hover:underline">
                    {tr("Leer nota completa...")}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={tr("Nota de Levantamiento")}
        subtitle={viewing ? `${viewing.author} · ${viewing.date} · ${client.name} (${client.id})` : ""}
        size="lg"
        footer={<Button onClick={() => setViewing(null)}>{tr("Cerrar")}</Button>}
      >
        <div className="whitespace-pre-wrap break-words rounded-lg border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-07080C) p-3.5 font-mono text-xs leading-relaxed text-(color:--tf-white) sm:text-sm">
          {viewing ? tr(viewing.text) : ""}
        </div>
      </Modal>

      {editing && (
        <EditFieldsModal
          title={tr("Editar nota de levantamiento")}
          fields={[{ name: "text", label: tr("Nota"), value: editing.text, multiline: true, required: true }]}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            updateClient(client.id, (c) => ({
              ...c,
              levantamientoNotes: c.levantamientoNotes.map((n) => (n.id === editing.id ? { ...n, text: v.text, editedAt: nowStamp() } : n)),
            }));
            setEditing(null);
            toast(tr("Nota actualizada"));
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 2. Propuesta

const SLOTS: { id: ProposalSlotId; code: string; title: string; description: string; accept?: string; urlPlaceholder: string }[] = [
  {
    id: "presentacion",
    code: "P1",
    title: "Presentación de la Propuesta",
    description: "Diapositivas comerciales, presentación ejecutiva o deck (.pptx, .key, .pdf).",
    accept: ".pptx,.ppt,.key,.pdf,.odp",
    urlPlaceholder: "https://slides.google.com/... o canva.com/...",
  },
  {
    id: "pdf",
    code: "P2",
    title: "PDF Resumen de la Propuesta",
    description: "Documento formal en PDF con alcance técnico, cotización, SLA y cláusulas.",
    accept: ".pdf,application/pdf",
    urlPlaceholder: "https://drive.google.com/...",
  },
  {
    id: "demo",
    code: "P3",
    title: "Prototipo / Demo del Aplicativo",
    description: "URL del prototipo web, demo interactivo o diseño en Figma; o un archivo (zip, video).",
    urlPlaceholder: "https://demo.twoffactor.com/app-cliente",
  },
];

const UPLOAD_ERRORS: Record<string, string> = {
  too_large: "El archivo supera el máximo de 25 MB.",
  empty_file: "El archivo está vacío.",
  forbidden: "La subida fue rechazada por el servidor.",
};

function ProposalSlotCard({ client, me, slotId }: PanelProps & { slotId: ProposalSlotId }) {
  const cfg = SLOTS.find((s) => s.id === slotId)!;
  const slot = client.propuesta.slots[slotId];
  const { confirm, toast } = useFeedback();
  const [url, setUrl] = useState(slot.url);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const urlDirty = url.trim() !== slot.url;

  function setSlot(update: Partial<typeof slot>, log?: ReturnType<typeof activity>) {
    updateClient(
      client.id,
      (c) => ({
        ...c,
        propuesta: { ...c.propuesta, slots: { ...c.propuesta.slots, [slotId]: { ...c.propuesta.slots[slotId], ...update } } },
      }),
      log
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const stored = await uploadClientFile(client.id, file, me);
      const previous = slot.file;
      setSlot({ file: stored, legacyFileName: undefined }, activity(me, "Archivo {file} cargado en {slot}", { file: stored.name, slot: cfg.title }));
      if (previous) await deleteStoredFile(previous);
      toast(tr("Archivo {file} cargado", { file: stored.name }));
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      toast(tr(UPLOAD_ERRORS[code] ?? "No se pudo subir el archivo ({error}).", { error: code }), "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeFile(file: StoredFile) {
    if (!(await confirm({ title: tr("¿Eliminar el archivo {file}?", { file: file.name }), message: tr("Se borrará del almacenamiento y no se puede deshacer."), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    await deleteStoredFile(file);
    setSlot({ file: undefined }, activity(me, "Archivo {file} eliminado de {slot}", { file: file.name, slot: cfg.title }));
    toast(tr("Archivo eliminado"));
  }

  function saveUrl() {
    const value = url.trim();
    if (value && !isHttpsUrl(value)) {
      toast(tr("El enlace debe empezar por https://"), "warn");
      return;
    }
    setSlot({ url: value }, activity(me, "Enlace de {slot} actualizado", { slot: cfg.title }));
    toast(tr("Enlace guardado"));
  }

  return (
    <div className={cx(panelClass, "flex flex-col gap-3 p-3 sm:p-4")}>
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">
          <Badge tone="laton">{cfg.code}</Badge> {tr(cfg.title)}
        </div>
        <p className="mt-1 text-[11px] text-(color:--tf-94A3B8-niebla)">{tr(cfg.description)}</p>
      </div>

      <div className={cx(subPanelClass, "space-y-2 p-3")}>
        <span className="block text-[10px] font-bold uppercase text-(color:--tf-888888)">{tr("Archivo")}</span>
        {slot.file ? (
          <div className="space-y-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-(color:--tf-white)" title={slot.file.name}>
                📎 {slot.file.name}
              </div>
              <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">
                {formatBytes(slot.file.size)} · {slot.file.uploadedBy} · {slot.file.uploadedAt}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a href={fileUrl(slot.file)} download className="inline-flex items-center rounded-lg border border-(color:--tf-22C55E-fosforo)/70 bg-(color:--tf-22C55E-fosforo)/15 px-2.5 py-1 text-[11px] font-bold text-(color:--tf-22C55E-fosforo) hover:bg-(color:--tf-22C55E-fosforo)/25 pointer-coarse:min-h-10">
                ⬇ {tr("Descargar")}
              </a>
              <a href={fileUrl(slot.file, true)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/50 px-2.5 py-1 text-[11px] text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white) pointer-coarse:min-h-10">
                {tr("Ver")} ↗
              </a>
              <Button size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {tr("Reemplazar")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => removeFile(slot.file!)}>
                {tr("Eliminar")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {slot.legacyFileName && (
              <p className="text-[11px] text-(color:--tf-E5A93C-laton)">
                {tr("Registrado sin archivo: {file}. Súbelo para poder descargarlo.", { file: slot.legacyFileName })}
              </p>
            )}
            <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? tr("Subiendo...") : tr("⬆ Subir archivo")}
            </Button>
          </div>
        )}
        <input ref={fileInput} type="file" accept={cfg.accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <div className={cx(subPanelClass, "space-y-2 p-3")}>
        <span className="block text-[10px] font-bold uppercase text-(color:--tf-888888)">{tr("Enlace")}</span>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={tr(cfg.urlPlaceholder)} className={inputClass} />
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" disabled={!urlDirty} onClick={saveUrl}>
            {tr("Guardar enlace")}
          </Button>
          {slot.url && (
            <a href={slot.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-(color:--tf-E5A93C-laton)/60 bg-(color:--tf-E5A93C-laton)/15 px-2.5 py-1 text-[11px] font-bold text-(color:--tf-E5A93C-laton) hover:bg-(color:--tf-E5A93C-laton)/25 pointer-coarse:min-h-10">
              {tr("Abrir")} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function PropuestaPanel({ client, me }: PanelProps) {
  const generated = client.propuesta.generated;
  return (
    <div className="space-y-3">
      <StageHeader
        client={client}
        stageId={2}
        title={tr("Propuesta // Archivos, Presentación & URL del Aplicativo")}
        description={tr("Sube la presentación comercial, el resumen en PDF y vincula el prototipo del aplicativo.")}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {SLOTS.map((s) => (
          <ProposalSlotCard key={s.id} client={client} me={me} slotId={s.id} />
        ))}
      </div>

      <div className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <SectionTitle
          aside={
            <Button size="sm" variant="warn" onClick={() => navigate("handshake", "propuesta", client.id)}>
              {tr("Generar propuesta en Handshake ➔")}
            </Button>
          }
        >
          {tr("Propuestas comerciales generadas ({count})", { count: generated.length })}
        </SectionTitle>
        {generated.length === 0 ? (
          <EmptyState>{tr("Aún no se ha guardado ninguna propuesta desde Handshake para este cliente.")}</EmptyState>
        ) : (
          <ul className="space-y-2">
            {generated.map((g) => (
              <li key={g.ref} className={cx(subPanelClass, "flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs")}>
                <div>
                  <div className="font-mono font-bold text-(color:--tf-E5A93C-laton)">{g.ref}</div>
                  <div className="text-[11px] text-(color:--tf-94A3B8-niebla)">
                    {tr(g.plan)} · {tr("{n} nodos", { n: g.nodes })} · {tr("{d}% dto.", { d: g.discount })} · {g.createdBy} · {g.createdAt}
                  </div>
                </div>
                <strong className="font-mono text-(color:--tf-white)">{formatUsd(g.total)} USD/{tr("mes")}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 3. Desarrollo

const REPO_STATUSES: GithubRepo["status"][] = ["Activo", "Sincronizado", "En Revisión"];

export function DesarrolloPanel({ client, me }: PanelProps) {
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [editing, setEditing] = useState<GithubRepo | null>(null);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !isHttpsUrl(url.trim())) {
      toast(tr("Indica un nombre y una URL que empiece por https://"), "warn");
      return;
    }
    const repo: GithubRepo = { id: newId("gh"), name: name.trim(), url: url.trim(), branch: branch.trim() || "main", status: "Activo" };
    updateClient(client.id, (c) => ({ ...c, githubRepos: [...c.githubRepos, repo] }), activity(me, "Repositorio {repo} vinculado", { repo: repo.name }));
    setName("");
    setUrl("");
    setBranch("main");
    toast(tr("Repositorio vinculado"));
  }

  async function remove(repo: GithubRepo) {
    if (!(await confirm({ title: tr("¿Desvincular {repo}?", { repo: repo.name }), message: tr("Solo se quita el enlace de la Bóveda; el repositorio en GitHub no se toca."), confirmLabel: tr("Desvincular"), tone: "danger" }))) return;
    updateClient(client.id, (c) => ({ ...c, githubRepos: c.githubRepos.filter((r) => r.id !== repo.id) }), activity(me, "Repositorio {repo} desvinculado", { repo: repo.name }));
    toast(tr("Repositorio desvinculado"));
  }

  return (
    <div className="space-y-3">
      <StageHeader
        client={client}
        stageId={3}
        title={tr("Desarrollo // Repositorios en GitHub del Proyecto")}
        description={tr("Enlaces directos a los repositorios de código fuente, SDKs y microservicios del cliente.")}
      />

      <form onSubmit={add} className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <span className="block text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("+ Vincular Nuevo Repositorio de GitHub")}</span>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr_0.6fr]">
          <Field label={tr("Nombre o alias *")}>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("ej: twoffactor/cliente-backend-api")} className={inputClass} />
          </Field>
          <Field label={tr("URL de GitHub *")}>
            <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/twoffactor/..." className={inputClass} />
          </Field>
          <Field label={tr("Rama")}>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline">
            {tr("Vincular Repositorio")}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="px-1 text-xs font-bold uppercase text-(color:--tf-E5A93C-laton)">{tr("Repositorios vinculados ({count})", { count: client.githubRepos.length })}</div>
        {client.githubRepos.length === 0 ? (
          <EmptyState>{tr("Aún no hay repositorios de GitHub vinculados. Añade uno con el formulario arriba.")}</EmptyState>
        ) : (
          client.githubRepos.map((repo) => (
            <div key={repo.id} className={cx(panelClass, "flex flex-wrap items-center justify-between gap-3 p-3")}>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-(color:--tf-white)">{repo.name}</div>
                <div className="truncate font-mono text-[11px] text-(color:--tf-94A3B8-niebla)">{repo.url}</div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="laton">
                  {tr("Rama:")} {repo.branch}
                </Badge>
                <Badge tone="fosforo">{tr(repo.status)}</Badge>
                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-(color:--tf-22C55E-fosforo)/70 bg-(color:--tf-22C55E-fosforo)/15 px-2.5 py-1 text-[11px] font-bold text-(color:--tf-22C55E-fosforo) hover:bg-(color:--tf-22C55E-fosforo)/25 pointer-coarse:min-h-10">
                  {tr("Ver en GitHub")} ↗
                </a>
                <IconButton label={tr("Editar repositorio")} onClick={() => setEditing(repo)}>
                  ✏️
                </IconButton>
                <IconButton label={tr("Desvincular repositorio")} tone="danger" onClick={() => remove(repo)}>
                  🗑
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <EditFieldsModal
          title={tr("Editar repositorio")}
          fields={[
            { name: "name", label: tr("Nombre o alias"), value: editing.name, required: true },
            { name: "url", label: tr("URL de GitHub"), value: editing.url, required: true, type: "url" },
            { name: "branch", label: tr("Rama"), value: editing.branch, required: true },
            { name: "status", label: tr("Estado"), value: editing.status, options: REPO_STATUSES.map((s) => ({ value: s, label: tr(s) })) },
          ]}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            if (!isHttpsUrl(v.url)) {
              toast(tr("El enlace debe empezar por https://"), "warn");
              return;
            }
            updateClient(
              client.id,
              (c) => ({
                ...c,
                githubRepos: c.githubRepos.map((r) => (r.id === editing.id ? { ...r, name: v.name, url: v.url, branch: v.branch, status: v.status as GithubRepo["status"] } : r)),
              }),
              activity(me, "Repositorio {repo} actualizado", { repo: v.name })
            );
            setEditing(null);
            toast(tr("Repositorio actualizado"));
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 4. Marcha Blanca

export function MarchaBlancaPanel({ client, me }: PanelProps) {
  const { confirm, toast } = useFeedback();
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDesc, setPhaseDesc] = useState("");
  const [escTitle, setEscTitle] = useState("");
  const [escContent, setEscContent] = useState("");
  const [editingPhase, setEditingPhase] = useState<MarchaBlancaSubStage | null>(null);
  const [editingEsc, setEditingEsc] = useState<MarchaBlancaEscrito | null>(null);

  const phases = client.marchaBlancaStages;
  const done = phases.filter((p) => p.done).length;

  function addPhase(e: FormEvent) {
    e.preventDefault();
    if (!phaseTitle.trim()) return;
    const phase: MarchaBlancaSubStage = { id: newId("mb"), title: phaseTitle.trim(), description: phaseDesc.trim(), done: false };
    updateClient(client.id, (c) => ({ ...c, marchaBlancaStages: [...c.marchaBlancaStages, phase] }), activity(me, "Fase de marcha blanca creada: {title}", { title: phase.title }));
    setPhaseTitle("");
    setPhaseDesc("");
  }

  function togglePhase(phase: MarchaBlancaSubStage) {
    const nextDone = !phase.done;
    updateClient(
      client.id,
      (c) => ({
        ...c,
        marchaBlancaStages: c.marchaBlancaStages.map((p) =>
          p.id === phase.id ? { ...p, done: nextDone, doneAt: nextDone ? nowStamp() : undefined, doneBy: nextDone ? me : undefined } : p
        ),
      }),
      activity(me, nextDone ? "Fase superada: {title}" : "Fase reabierta: {title}", { title: phase.title })
    );
  }

  async function removePhase(phase: MarchaBlancaSubStage) {
    if (!(await confirm({ title: tr("¿Eliminar la fase \"{title}\"?", { title: phase.title }), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    updateClient(client.id, (c) => ({ ...c, marchaBlancaStages: c.marchaBlancaStages.filter((p) => p.id !== phase.id) }), activity(me, "Fase de marcha blanca eliminada: {title}", { title: phase.title }));
  }

  function addEscrito(e: FormEvent) {
    e.preventDefault();
    if (!escTitle.trim() || !escContent.trim()) return;
    const esc: MarchaBlancaEscrito = { id: newId("esc"), title: escTitle.trim(), content: escContent.trim(), author: me, date: todayStamp() };
    updateClient(client.id, (c) => ({ ...c, marchaBlancaEscritos: [esc, ...c.marchaBlancaEscritos] }));
    setEscTitle("");
    setEscContent("");
    toast(tr("Escrito guardado"));
  }

  async function removeEscrito(esc: MarchaBlancaEscrito) {
    if (!(await confirm({ title: tr("¿Eliminar el escrito \"{title}\"?", { title: esc.title }), confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    updateClient(client.id, (c) => ({ ...c, marchaBlancaEscritos: c.marchaBlancaEscritos.filter((x) => x.id !== esc.id) }), activity(me, "Escrito eliminado: {title}", { title: esc.title }));
  }

  return (
    <div className="space-y-3">
      <StageHeader
        client={client}
        stageId={4}
        title={tr("Marcha Blanca // Fases Piloto & Escritos Clave con el Cliente")}
        description={tr("Fases de pruebas piloto en sandbox y consideraciones críticas acordadas con el cliente.")}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <section className={cx(panelClass, "space-y-3 p-3 sm:p-4 lg:col-span-5")}>
          <SectionTitle aside={<span className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr("{done} de {total} superadas", { done, total: phases.length })}</span>}>
            {tr("Fases de Marcha Blanca")}
          </SectionTitle>
          {phases.length > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-(color:--tf-black)/70" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={phases.length}>
              <div className="h-full bg-(color:--tf-22C55E-fosforo) transition-all" style={{ width: `${(done / phases.length) * 100}%` }} />
            </div>
          )}
          <ul className="space-y-2">
            {phases.length === 0 && <EmptyState>{tr("Sin fases definidas. Crea la primera abajo.")}</EmptyState>}
            {phases.map((p) => (
              <li key={p.id} className={cx(subPanelClass, "flex items-start gap-2.5 p-2.5")}>
                <input
                  type="checkbox"
                  checked={p.done}
                  onChange={() => togglePhase(p)}
                  aria-label={p.done ? tr("Marcar como pendiente") : tr("Marcar como superada")}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-(color:--tf-22C55E-fosforo) pointer-coarse:h-6 pointer-coarse:w-6"
                />
                <div className="min-w-0 flex-1">
                  <div className={cx("text-xs font-bold", p.done ? "text-(color:--tf-22C55E-fosforo)" : "text-(color:--tf-white)")}>{tr(p.title)}</div>
                  {p.description && <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">{tr(p.description)}</p>}
                  {p.done && p.doneBy && (
                    <p className="text-[10px] text-(color:--tf-64748B)">
                      ✓ {p.doneBy} · {p.doneAt}
                    </p>
                  )}
                </div>
                <IconButton label={tr("Editar fase")} onClick={() => setEditingPhase(p)}>
                  ✏️
                </IconButton>
                <IconButton label={tr("Eliminar fase")} tone="danger" onClick={() => removePhase(p)}>
                  🗑
                </IconButton>
              </li>
            ))}
          </ul>
          <form onSubmit={addPhase} className="space-y-2 border-t border-(color:--tf-B87333-cobre)/20 pt-3">
            <input required value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} placeholder={tr("Nueva fase: ej. Prueba con 50 usuarios piloto")} className={inputClass} />
            <input value={phaseDesc} onChange={(e) => setPhaseDesc(e.target.value)} placeholder={tr("Descripción o criterio de éxito (opcional)")} className={inputClass} />
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="outline">
                {tr("+ Añadir fase")}
              </Button>
            </div>
          </form>
        </section>

        <section className={cx(panelClass, "space-y-3 p-3 sm:p-4 lg:col-span-7")}>
          <SectionTitle>{tr("Escritos y Puntos a Tener en Cuenta con el Cliente")}</SectionTitle>
          <form onSubmit={addEscrito} className={cx(subPanelClass, "space-y-2 p-3")}>
            <input required value={escTitle} onChange={(e) => setEscTitle(e.target.value)} placeholder={tr("Título de la consideración...")} className={inputClass} />
            <textarea
              rows={2}
              required
              value={escContent}
              onChange={(e) => setEscContent(e.target.value)}
              placeholder={tr("Punto acordado, horario de pruebas, excepciones o riesgo a vigilar...")}
              className={inputClass}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-(color:--tf-94A3B8-niebla)">
                {tr("Escrito por:")} <AuthorDot name={me} /> <strong className="text-(color:--tf-white)">{me}</strong>
              </span>
              <Button type="submit" size="sm" variant="outline">
                {tr("+ Guardar Escrito")}
              </Button>
            </div>
          </form>
          <ul className="space-y-2">
            {client.marchaBlancaEscritos.length === 0 && <EmptyState>{tr("Sin escritos registrados.")}</EmptyState>}
            {client.marchaBlancaEscritos.map((esc) => (
              <li key={esc.id} className={cx(subPanelClass, "space-y-1 p-3")}>
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-bold text-(color:--tf-white)">{tr(esc.title)}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[10px] font-semibold text-(color:--tf-E5A93C-laton)">
                      {esc.author} • {esc.date}
                    </span>
                    {esc.author === me && (
                      <>
                        <IconButton label={tr("Editar escrito")} onClick={() => setEditingEsc(esc)}>
                          ✏️
                        </IconButton>
                        <IconButton label={tr("Eliminar escrito")} tone="danger" onClick={() => removeEscrito(esc)}>
                          🗑
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-line text-[11px] leading-relaxed text-(color:--tf-C0C0C0-plata)">{tr(esc.content)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editingPhase && (
        <EditFieldsModal
          title={tr("Editar fase de marcha blanca")}
          fields={[
            { name: "title", label: tr("Título"), value: editingPhase.title, required: true },
            { name: "description", label: tr("Descripción"), value: editingPhase.description, multiline: true },
          ]}
          onClose={() => setEditingPhase(null)}
          onSave={(v) => {
            updateClient(client.id, (c) => ({
              ...c,
              marchaBlancaStages: c.marchaBlancaStages.map((p) => (p.id === editingPhase.id ? { ...p, title: v.title, description: v.description } : p)),
            }));
            setEditingPhase(null);
          }}
        />
      )}
      {editingEsc && (
        <EditFieldsModal
          title={tr("Editar escrito")}
          fields={[
            { name: "title", label: tr("Título"), value: editingEsc.title, required: true },
            { name: "content", label: tr("Contenido"), value: editingEsc.content, multiline: true, required: true },
          ]}
          onClose={() => setEditingEsc(null)}
          onSave={(v) => {
            updateClient(client.id, (c) => ({
              ...c,
              marchaBlancaEscritos: c.marchaBlancaEscritos.map((x) => (x.id === editingEsc.id ? { ...x, title: v.title, content: v.content, editedAt: nowStamp() } : x)),
            }));
            setEditingEsc(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 5. Producción

const NOTE_TYPES: { value: ProduccionNoteType; label: string }[] = [
  { value: "ok", label: "Estado: Todo OK" },
  { value: "mantenimiento", label: "Ventana de mantenimiento" },
  { value: "alerta", label: "Alerta / caída" },
];

function Kpi({ label, value, hint, tone = "white" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "white" | "fosforo" | "laton" | "danger" }) {
  const toneClass =
    tone === "fosforo" ? "text-(color:--tf-22C55E-fosforo)" : tone === "laton" ? "text-(color:--tf-E5A93C-laton)" : tone === "danger" ? "text-(color:--tf-red-400)" : "text-(color:--tf-white)";
  return (
    <div className={cx(panelClass, "space-y-1 p-3")}>
      <div className="text-[10px] font-bold uppercase text-(color:--tf-94A3B8-niebla)">{label}</div>
      <div className={cx("text-lg font-bold sm:text-xl", toneClass)}>{value}</div>
      {hint && <div className="text-[10px] text-(color:--tf-94A3B8-niebla)">{hint}</div>}
    </div>
  );
}

export function ProduccionPanel({ client, me }: PanelProps) {
  const { confirm, toast } = useFeedback();
  const [text, setText] = useState("");
  const [type, setType] = useState<ProduccionNoteType>("ok");
  const [editing, setEditing] = useState<ProduccionNote | null>(null);
  const [telemetryDraft, setTelemetryDraft] = useState(client.telemetryUrl);
  const [editingTelemetry, setEditingTelemetry] = useState(!client.telemetryUrl);

  const plan = getPlan(client.plan);
  const prodValidation = client.stageValidations.find((v) => v.stageId === 5);
  const prodSince = prodValidation ? parseStamp(prodValidation.completedAt) : NaN;
  const [now] = useState(() => Date.now());
  const daysInProduction = Number.isNaN(prodSince) ? null : Math.max(0, daysBetween(prodSince, now));
  const notes = client.produccionNotes;
  const alerts = notes.filter((n) => n.type === "alerta").length;
  const maintenances = notes.filter((n) => n.type === "mantenimiento").length;
  const latest = notes[0];

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const note: ProduccionNote = { id: newId("prod"), text: text.trim(), type, date: nowStamp(), author: me };
    updateClient(client.id, (c) => ({ ...c, produccionNotes: [note, ...c.produccionNotes] }));
    setText("");
    toast(tr("Nota de producción guardada"));
  }

  async function remove(note: ProduccionNote) {
    if (!(await confirm({ title: tr("¿Eliminar esta nota de producción?"), message: note.text, confirmLabel: tr("Eliminar"), tone: "danger" }))) return;
    updateClient(client.id, (c) => ({ ...c, produccionNotes: c.produccionNotes.filter((n) => n.id !== note.id) }), activity(me, "Nota de producción del {date} eliminada", { date: note.date }));
  }

  function saveTelemetry() {
    const value = telemetryDraft.trim();
    if (value && !isHttpsUrl(value)) {
      toast(tr("El enlace debe empezar por https://"), "warn");
      return;
    }
    updateClient(client.id, (c) => ({ ...c, telemetryUrl: value }), activity(me, value ? "Panel de telemetría vinculado" : "Panel de telemetría desvinculado"));
    setEditingTelemetry(!value);
    toast(value ? tr("Panel de telemetría vinculado") : tr("Panel de telemetría desvinculado"));
  }

  const status =
    !latest
      ? { label: tr("SIN REGISTROS EN BITÁCORA"), tone: "muted" as const }
      : latest.type === "alerta"
      ? { label: tr("● ALERTA REGISTRADA ({date})", { date: latest.date }), tone: "danger" as const }
      : latest.type === "mantenimiento"
      ? { label: tr("● EN MANTENIMIENTO ({date})", { date: latest.date }), tone: "laton" as const }
      : { label: tr("● OPERANDO SIN NOVEDAD ({date})", { date: latest.date }), tone: "fosforo" as const };

  return (
    <div className="space-y-3">
      <StageHeader
        client={client}
        stageId={5}
        tone="fosforo"
        title={tr("Salida a Producción // Telemetría & Bitácora")}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {tr("Estado según la última entrada de la bitácora:")} <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Kpi label={tr("SLA contractual")} value={tr(plan.disponibilidad)} hint={tr("P1 {time} · Plan {plan}", { time: tr(plan.respuesta.P1), plan: tr(plan.name) })} tone="fosforo" />
        <Kpi label={tr("Días en producción")} value={daysInProduction ?? "—"} hint={prodValidation ? tr("Desde {date}", { date: prodValidation.completedAt.slice(0, 10) }) : tr("Aún no está en producción")} />
        <Kpi label={tr("Alertas registradas")} value={alerts} hint={tr("{n} ventanas de mantenimiento", { n: maintenances })} tone={alerts > 0 ? "danger" : "fosforo"} />
        <Kpi label={tr("Nodos asignados")} value={client.nodesAssigned} hint={tr(plan.infraestructura)} tone="laton" />
      </div>

      <section className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <SectionTitle
          aside={
            client.telemetryUrl && !editingTelemetry ? (
              <div className="flex gap-1.5">
                <a href={client.telemetryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-(color:--tf-B87333-cobre)/40 px-2.5 py-1 text-[11px] text-(color:--tf-C0C0C0-plata) hover:text-(color:--tf-white) pointer-coarse:min-h-10">
                  {tr("Abrir")} ↗
                </a>
                <Button size="sm" onClick={() => setEditingTelemetry(true)}>
                  {tr("Cambiar enlace")}
                </Button>
              </div>
            ) : null
          }
        >
          {tr("Panel de telemetría (PowerBI)")}
        </SectionTitle>
        {client.telemetryUrl && !editingTelemetry ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-(color:--tf-B87333-cobre)/30 bg-(color:--tf-black)">
            <iframe src={client.telemetryUrl} title={tr("Telemetría de {client}", { client: client.name })} className="h-full w-full" allowFullScreen referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-(color:--tf-94A3B8-niebla)">
              {tr("Pega el enlace de inserción del informe PowerBI de este cliente (Archivo → Insertar informe). Se mostrará aquí con los datos en vivo.")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="url" value={telemetryDraft} onChange={(e) => setTelemetryDraft(e.target.value)} placeholder="https://app.powerbi.com/reportEmbed?..." className={inputClass} />
              <Button variant="outline" onClick={saveTelemetry}>
                {tr("Guardar enlace")}
              </Button>
              {client.telemetryUrl && (
                <Button onClick={() => { setTelemetryDraft(client.telemetryUrl); setEditingTelemetry(false); }}>
                  {tr("Cancelar")}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className={cx(panelClass, "space-y-3 p-3 sm:p-4")}>
        <SectionTitle>{tr("Bitácora de Monitoreo & Notas de Producción")}</SectionTitle>
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <select value={type} onChange={(e) => setType(e.target.value as ProduccionNoteType)} className={cx(inputClass, "sm:w-52")}>
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {tr(t.label)}
              </option>
            ))}
          </select>
          <input required value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("Escribe una nota sobre el funcionamiento en producción...")} className={inputClass} />
          <Button type="submit" variant="outline">
            {tr("Guardar nota")}
          </Button>
        </form>
        <ul className="space-y-2">
          {notes.length === 0 && <EmptyState>{tr("Sin notas de producción.")}</EmptyState>}
          {notes.map((n) => (
            <li key={n.id} className={cx(subPanelClass, "flex flex-col gap-1.5 p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between")}>
              <div className="flex min-w-0 items-start gap-2">
                <Badge tone={n.type === "ok" ? "fosforo" : n.type === "mantenimiento" ? "laton" : "danger"}>{tr(n.type === "ok" ? "OK" : n.type === "alerta" ? "ALERTA" : "MANTENIMIENTO")}</Badge>
                <span className="break-words text-(color:--tf-white)">{tr(n.text)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-[10px] text-(color:--tf-64748B)">
                  {n.date} • {n.author}
                </span>
                {n.author === me && (
                  <>
                    <IconButton label={tr("Editar nota")} onClick={() => setEditing(n)}>
                      ✏️
                    </IconButton>
                    <IconButton label={tr("Eliminar nota")} tone="danger" onClick={() => remove(n)}>
                      🗑
                    </IconButton>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {editing && (
        <EditFieldsModal
          title={tr("Editar nota de producción")}
          fields={[
            { name: "type", label: tr("Tipo"), value: editing.type, options: NOTE_TYPES.map((t) => ({ value: t.value, label: tr(t.label) })) },
            { name: "text", label: tr("Nota"), value: editing.text, multiline: true, required: true },
          ]}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            updateClient(client.id, (c) => ({
              ...c,
              produccionNotes: c.produccionNotes.map((n) => (n.id === editing.id ? { ...n, text: v.text, type: v.type as ProduccionNoteType, editedAt: nowStamp() } : n)),
            }));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

export function StagePanel({ client, me, stageId }: PanelProps & { stageId: ProjectStageId }) {
  switch (stageId) {
    case 1:
      return <LevantamientoPanel client={client} me={me} />;
    case 2:
      return <PropuestaPanel client={client} me={me} />;
    case 3:
      return <DesarrolloPanel client={client} me={me} />;
    case 4:
      return <MarchaBlancaPanel client={client} me={me} />;
    default:
      return <ProduccionPanel client={client} me={me} />;
  }
}
