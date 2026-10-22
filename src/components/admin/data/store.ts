"use client";

import { useSyncExternalStore } from "react";
import { nowStamp } from "./time";

const SAVED_EVENT = "tos-store-saved";
let lastSavedAt: string | null = null;

export interface LocalStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(onChange: () => void): () => void;
  getServer(): T;
}

// A value persisted in localStorage and shared live between modules and tabs.
// `read` validates and upgrades what was stored (returning null falls back to the seed).
export function createLocalStore<T>(key: string, seed: () => T, read?: (raw: unknown) => T | null): LocalStore<T> {
  const eventName = `tos-store:${key}`;
  let cache: T | undefined;
  let serverValue: T | undefined;

  function load(): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const value = read ? read(parsed) : (parsed as T);
        if (value != null) return value;
      }
    } catch {
      // Corrupt or unavailable storage: start from the seed
    }
    return seed();
  }

  function get(): T {
    if (cache === undefined) cache = load();
    return cache;
  }

  function set(next: T | ((prev: T) => T)) {
    const value = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    cache = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      lastSavedAt = nowStamp();
    } catch {
      // Storage full or blocked: keep the in-memory value for this session
    }
    window.dispatchEvent(new Event(eventName));
    window.dispatchEvent(new Event(SAVED_EVENT));
  }

  function subscribe(onChange: () => void) {
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return;
      cache = undefined;
      onChange();
    }
    window.addEventListener(eventName, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(eventName, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }

  function getServer(): T {
    if (serverValue === undefined) serverValue = seed();
    return serverValue;
  }

  return { get, set, subscribe, getServer };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

function subscribeSaved(onChange: () => void) {
  window.addEventListener(SAVED_EVENT, onChange);
  return () => window.removeEventListener(SAVED_EVENT, onChange);
}

// Time of the last write from this tab, shown in the status bar
export function useLastSavedAt(): string | null {
  return useSyncExternalStore(subscribeSaved, () => lastSavedAt, () => null);
}

export function nextSequentialId(prefix: string, ids: string[], digits: number): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`, "i");
  let max = 0;
  for (const id of ids) {
    const match = id.match(pattern);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(digits, "0")}`;
}
