import { randomUUID } from "node:crypto";
import { authenticatedUserId } from "@/src/lib/server/auth";
import { validateUpload } from "@/src/lib/server/fileSecurity";
import { listUploads, storeUpload } from "@/src/lib/server/uploadStorage";

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ files: await listUploads(userId) });
}

export async function POST(request) {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Content-Length rejects oversized bodies before allocating a File buffer.
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 51 * 1024 * 1024) throw new Error("size");
    const form = await request.formData();
    const file = form.get("file");
    const checked = await validateUpload(file);
    const id = randomUUID();
    await storeUpload(userId, id, checked.bytes, {
      name: file.name,
      mime: checked.mime,
      size: checked.bytes.byteLength,
      createdAt: new Date().toISOString(),
    });
    return Response.json({ id, name: file.name }, { status: 201 });
  } catch {
    return Response.json({ error: "Unsupported upload" }, { status: 415 });
  }
}
