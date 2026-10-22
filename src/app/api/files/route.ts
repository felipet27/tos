import { MAX_FILE_BYTES, filesBucket, isSameOrigin, safeFileName } from "./shared";

// Upload one file for a client: multipart form with `file` and `clientId`
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  const clientId = String(form.get("clientId") ?? "").toUpperCase();
  if (!(file instanceof File)) return Response.json({ error: "missing_file" }, { status: 400 });
  if (!/^[A-Z0-9-]{1,40}$/.test(clientId)) return Response.json({ error: "invalid_client" }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: "too_large" }, { status: 413 });

  const name = safeFileName(file.name);
  const key = `clients/${clientId}/${crypto.randomUUID()}-${name}`;
  const contentType = file.type || "application/octet-stream";

  const bucket = await filesBucket();
  // R2 needs the body length up front, so the (size-capped) file is read whole
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType },
    customMetadata: { originalName: file.name.slice(0, 200) },
  });

  return Response.json({ key, name: file.name, size: file.size, type: contentType });
}
