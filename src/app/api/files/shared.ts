import { getCloudflareContext } from "@opennextjs/cloudflare";

// Files attached to Bóveda client records live in the FILES R2 bucket under clients/<id>/
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function filesBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.FILES;
}

// Only the TOS page itself may call these endpoints from a browser. This is not
// authentication (there is no server session yet), it only stops other websites
// from using a visitor's browser to read or write files.
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().replace(/\s+/g, "_");
  return cleaned.slice(-120) || "archivo";
}

export function isValidKey(key: string): boolean {
  return /^clients\/[A-Z0-9-]{1,40}\/[0-9a-f-]{36}-[\w.\-]{1,120}$/i.test(key);
}
