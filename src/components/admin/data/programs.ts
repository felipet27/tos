"use client";

export type ProgramId = "fundador" | "idea" | "roi";

export const PROGRAM_IDS: ProgramId[] = ["fundador", "idea", "roi"];

export const PROGRAM_META: Record<ProgramId, { name: string; tone: "laton" | "fosforo" | "cian" }> = {
  fundador: { name: "Cliente Fundador", tone: "laton" },
  idea: { name: "Desarrolla tu Idea", tone: "fosforo" },
  roi: { name: "Retorno de Inversión", tone: "cian" },
};
