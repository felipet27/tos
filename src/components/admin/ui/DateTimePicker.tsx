"use client";

import { useEffect, useState } from "react";
import { cx } from "./kit";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const pad = (n: number) => String(n).padStart(2, "0");

function parseValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

function toValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function displayDate(v: string): string {
  const d = parseValue(v);
  if (!d) return "";
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? "p.m." : "a.m.";
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}  ·  ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

export function DateTimePicker({
  value,
  onChange,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  const [open, setOpen] = useState(false);
  const sel = parseValue(value);
  const minDate = parseValue(min ?? "");
  const now = new Date();

  const [vy, setVy] = useState(() => (sel ?? now).getFullYear());
  const [vm, setVm] = useState(() => (sel ?? now).getMonth());

  useEffect(() => {
    if (sel) { setVy(sel.getFullYear()); setVm(sel.getMonth()); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function prevMonth() {
    const d = new Date(vy, vm - 1);
    setVy(d.getFullYear());
    setVm(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(vy, vm + 1);
    setVy(d.getFullYear());
    setVm(d.getMonth());
  }

  function pickDay(day: number) {
    const base = sel ? new Date(sel) : new Date();
    base.setFullYear(vy, vm, day);
    onChange(toValue(base));
  }

  function setHour(h: number) {
    const base = sel ? new Date(sel) : new Date();
    base.setHours(h);
    onChange(toValue(base));
  }

  function setMinute(m: number) {
    const base = sel ? new Date(sel) : new Date();
    base.setMinutes(m);
    onChange(toValue(base));
  }

  // Build calendar grid
  const firstWd = new Date(vy, vm, 1).getDay();
  const dim = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWd).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selH = sel?.getHours() ?? 0;
  const selM = sel?.getMinutes() ?? 0;

  const isDisabled = (day: number) =>
    !!minDate && new Date(vy, vm, day, 23, 59) < minDate;

  const isSel = (day: number) =>
    !!sel &&
    sel.getFullYear() === vy &&
    sel.getMonth() === vm &&
    sel.getDate() === day;

  const isToday = (day: number) =>
    now.getFullYear() === vy &&
    now.getMonth() === vm &&
    now.getDate() === day;

  return (
    // stopPropagation prevents the wrapping <label> (from Field) from double-firing clicks
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); }
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "w-full rounded-lg border bg-(color:--tf-black)/70 px-3 py-2 text-left text-base sm:text-xs focus:outline-none transition-colors",
          open
            ? "border-(color:--tf-22C55E-fosforo) ring-1 ring-(color:--tf-22C55E-fosforo)"
            : "border-(color:--tf-B87333-cobre)/40 hover:border-(color:--tf-B87333-cobre)/80"
        )}
      >
        {value ? (
          <span className="flex items-center justify-between gap-2">
            <span className="font-mono text-(color:--tf-white)">📅 {displayDate(value)}</span>
            <span className={cx("shrink-0 text-[10px] text-(color:--tf-94A3B8-niebla) transition-transform duration-150", open && "rotate-180")}>▾</span>
          </span>
        ) : (
          <span className="text-(color:--tf-666666)">Seleccionar fecha y hora…</span>
        )}
      </button>

      {/* Panel — inline (in document flow) to avoid overflow clipping from the modal */}
      {open && (
        <div className="mt-1.5 rounded-xl border border-(color:--tf-B87333-cobre)/50 bg-(color:--tf-07090F-panel) p-3 shadow-xl">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg border border-(color:--tf-B87333-cobre)/30 px-2.5 py-1 text-xs text-(color:--tf-C0C0C0-plata) transition-colors hover:border-(color:--tf-E5A93C-laton) hover:text-(color:--tf-white)"
            >
              ◀
            </button>
            <span className="text-xs font-bold tracking-wide text-(color:--tf-E5A93C-laton)">
              {MONTHS[vm]} {vy}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg border border-(color:--tf-B87333-cobre)/30 px-2.5 py-1 text-xs text-(color:--tf-C0C0C0-plata) transition-colors hover:border-(color:--tf-E5A93C-laton) hover:text-(color:--tf-white)"
            >
              ▶
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1.5 grid grid-cols-7">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-bold text-(color:--tf-94A3B8-niebla)">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dis = isDisabled(day);
              const s = isSel(day);
              const t = isToday(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => pickDay(day)}
                  className={cx(
                    "h-7 w-full rounded text-[11px] font-medium transition-colors",
                    s
                      ? "bg-(color:--tf-22C55E-fosforo) font-bold text-(color:--tf-black)"
                      : dis
                      ? "cursor-not-allowed text-(color:--tf-666666)"
                      : t
                      ? "border border-(color:--tf-E5A93C-laton)/60 text-(color:--tf-E5A93C-laton) hover:bg-(color:--tf-E5A93C-laton)/15"
                      : "text-(color:--tf-C0C0C0-plata) hover:bg-(color:--tf-22C55E-fosforo)/15 hover:text-(color:--tf-white)"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time selector */}
          <div className="mt-3 flex items-center gap-2 border-t border-(color:--tf-B87333-cobre)/25 pt-3">
            <span className="shrink-0 text-[10px] font-bold uppercase text-(color:--tf-E5A93C-laton)">
              Hora
            </span>
            <select
              value={selH}
              onChange={(e) => setHour(Number(e.target.value))}
              className="flex-1 rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/70 py-1.5 text-center text-xs text-(color:--tf-white) focus:outline-none focus:border-(color:--tf-22C55E-fosforo)"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{pad(i)}</option>
              ))}
            </select>
            <span className="font-bold text-(color:--tf-E5A93C-laton)">:</span>
            <select
              value={selM}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="flex-1 rounded-lg border border-(color:--tf-B87333-cobre)/40 bg-(color:--tf-black)/70 py-1.5 text-center text-xs text-(color:--tf-white) focus:outline-none focus:border-(color:--tf-22C55E-fosforo)"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>{pad(i)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-lg bg-(color:--tf-22C55E-fosforo) px-3 py-1.5 text-[11px] font-black text-(color:--tf-black) transition-all hover:brightness-110 active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
