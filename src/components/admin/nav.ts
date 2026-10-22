"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getRuntimeLocale } from "@/i18n/translate";

export type ModuleKey = "boveda" | "handshake" | "cultivo" | "taller" | "observatorio";

export const MODULE_KEYS: ModuleKey[] = ["boveda", "handshake", "cultivo", "taller", "observatorio"];

export interface AdminRoute {
  module: ModuleKey;
  /** Second segment: client id, sub tab, idea or task id... */
  sub?: string;
  /** Third segment, e.g. the client of /handshake/propuesta/FF-003 */
  sub2?: string;
}

// /es/boveda/FF-003 -> { module: "boveda", sub: "FF-003" }
export function parseAdminPath(pathname: string): AdminRoute {
  const [, segment, sub, sub2] = pathname.split("/").filter(Boolean);
  const decode = (s?: string) => (s ? decodeURIComponent(s) : undefined);
  return MODULE_KEYS.includes(segment as ModuleKey)
    ? { module: segment as ModuleKey, sub: decode(sub), sub2: decode(sub2) }
    : { module: "boveda" };
}

export function adminPath(module: ModuleKey, sub?: string, sub2?: string): string {
  const parts = [getRuntimeLocale(), module, sub, sub2].filter(Boolean).map((p) => encodeURIComponent(p as string));
  return `/${parts.join("/")}`;
}

// Navigation inside the panel: the URL changes (back button, shareable links) without reloading
export function navigate(module: ModuleKey, sub?: string, sub2?: string, options: { replace?: boolean } = {}) {
  const href = adminPath(module, sub, sub2);
  if (window.location.pathname === href) return;
  if (options.replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}

export function useAdminRoute(): AdminRoute {
  const pathname = usePathname();
  return useMemo(() => parseAdminPath(pathname ?? "/"), [pathname]);
}
