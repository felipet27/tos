"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// Local time stamps used across TOS: "2026-10-21 14:05" and "2026-10-21"
export function nowStamp(date: Date = new Date()): string {
  return `${todayStamp(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayStamp(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "2026-10-21 14:05" or "2026-10-21T14:05" or "2026-10-21" -> epoch ms (NaN when invalid)
export function parseStamp(value?: string | null): number {
  if (!value) return NaN;
  const normalized = value.trim().replace(" ", "T");
  return new Date(normalized.length === 10 ? `${normalized}T00:00` : normalized).getTime();
}

// Value for <input type="datetime-local">
export function toDateTimeInput(date: Date = new Date()): string {
  return `${todayStamp(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function daysBetween(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

// Re-renders the caller every `intervalMs` so relative times ("vence en 3h") stay current
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
