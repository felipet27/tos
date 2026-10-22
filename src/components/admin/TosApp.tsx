"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AdminLoginModal } from "./AdminLoginModal";
import { AdminPanel, AdminUser } from "./AdminPanel";
import { useDynamicFavicon } from "./adminMode";

const STORAGE_KEY = "twoffactor_admin_session";
const SESSION_EVENT = "tos-session-change";

// Public website, used by "Volver a Web" and when closing the login
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://twoffactor.com";

function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSession(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSession(user: AdminUser | null) {
  try {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function goToWebsite() {
  window.location.href = SITE_URL;
}

// TOS entry point: the login gate, then the operating system panel
export function TosApp() {
  useDynamicFavicon();
  // undefined while rendering on the server, before the browser session is known
  const raw = useSyncExternalStore(subscribe, readSession, () => undefined);
  const user = useMemo<AdminUser | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  }, [raw]);

  if (raw === undefined) return <div className="min-h-svh bg-(color:--tf-0B0C10-obsidiana)" />;

  if (!user) {
    return (
      <div className="min-h-svh bg-(color:--tf-0B0C10-obsidiana)">
        <AdminLoginModal isOpen onClose={goToWebsite} onSuccess={writeSession} />
      </div>
    );
  }

  return <AdminPanel user={user} isOpen onClose={goToWebsite} onLogout={() => writeSession(null)} />;
}
