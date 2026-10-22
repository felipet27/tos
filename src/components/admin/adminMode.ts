"use client";

import { createContext, useContext, useEffect } from "react";

// Factor 1 · Forja (steampunk de taller, oscuro) / Factor 2 · Cristal (laboratorio futurista, claro)
export type AdminMode = "forja" | "cristal";

export const ADMIN_MODE_STORAGE_KEY = "twoffactor_admin_mode";

export const AdminModeContext = createContext<AdminMode>("forja");

export function useAdminMode(): AdminMode {
  return useContext(AdminModeContext);
}

export function applyFavicon(mode: AdminMode) {
  if (typeof document === "undefined") return;

  const iconHref =
    mode === "cristal"
      ? "/favicons/favicon-cristal.svg"
      : "/favicons/favicon-forja.svg";

  // Buscar todos los tags de favicon actuales
  const existingLinks = document.querySelectorAll<HTMLLinkElement>(
    "link[rel*='icon']"
  );

  const currentLink = document.querySelector<HTMLLinkElement>(
    "link[data-tos-favicon='true']"
  );
  if (currentLink && currentLink.dataset.mode === mode) {
    return;
  }

  // Eliminar referencias anteriores para forzar actualización inmediata en el navegador
  existingLinks.forEach((link) => {
    link.parentNode?.removeChild(link);
  });

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = `${iconHref}?t=${Date.now()}`;
  link.setAttribute("data-tos-favicon", "true");
  link.setAttribute("data-mode", mode);
  document.head.appendChild(link);
}

export function useDynamicFavicon(mode?: AdminMode) {
  useEffect(() => {
    const targetMode = mode ?? loadAdminMode();
    applyFavicon(targetMode);
  }, [mode]);
}

export function loadAdminMode(): AdminMode {
  if (typeof window === "undefined") return "forja";
  try {
    return localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === "cristal" ? "cristal" : "forja";
  } catch {
    return "forja";
  }
}

export function saveAdminMode(mode: AdminMode) {
  try {
    localStorage.setItem(ADMIN_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
  applyFavicon(mode);
}

