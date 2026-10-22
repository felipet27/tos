import { filesBucket, isSameOrigin, isValidKey } from "../shared";

async function readKey(ctx: RouteContext<"/api/files/[...key]">): Promise<string | null> {
  const { key } = await ctx.params;
  const joined = key.map((part) => decodeURIComponent(part)).join("/");
  return isValidKey(joined) ? joined : null;
}

// Download (or open inline with ?inline=1) a stored file
export async function GET(request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  if (!isSameOrigin(request)) return new Response("forbidden", { status: 403 });
  const key = await readKey(ctx);
  if (!key) return new Response("not found", { status: 404 });

  const bucket = await filesBucket();
  const object = await bucket.get(key);
  if (!object) return new Response("not found", { status: 404 });

  const name = object.customMetadata?.originalName ?? key.split("/").pop() ?? "archivo";
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set(
    "content-disposition",
    `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`
  );
  return new Response(object.body, { headers });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/files/[...key]">) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const key = await readKey(ctx);
  if (!key) return Response.json({ error: "not_found" }, { status: 404 });
  const bucket = await filesBucket();
  await bucket.delete(key);
  return Response.json({ ok: true });
}
