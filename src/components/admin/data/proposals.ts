"use client";

import { createLocalStore, useLocalStore } from "./store";

// Consecutive proposal references per year: PROP-2026-0001, PROP-2026-0002...
interface ProposalCounter {
  year: number;
  last: number;
}

const counterStore = createLocalStore<ProposalCounter>(
  "twoffactor_handshake_proposal_counter_v1",
  () => ({ year: new Date().getFullYear(), last: 0 }),
  (raw) => {
    const r = raw as Partial<ProposalCounter> | null;
    return r && typeof r.year === "number" && typeof r.last === "number" ? (r as ProposalCounter) : null;
  }
);

function format(year: number, n: number) {
  return `PROP-${year}-${String(n).padStart(4, "0")}`;
}

// The reference the next saved proposal will get
export function useNextProposalRef(): string {
  const counter = useLocalStore(counterStore);
  const year = new Date().getFullYear();
  return format(year, counter.year === year ? counter.last + 1 : 1);
}

export function takeProposalRef(): string {
  const year = new Date().getFullYear();
  const current = counterStore.get();
  const next = current.year === year ? current.last + 1 : 1;
  counterStore.set({ year, last: next });
  return format(year, next);
}
