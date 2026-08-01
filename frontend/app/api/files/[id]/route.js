import { authenticatedUserId } from "@/src/lib/server/auth";
import { deleteUpload, readUpload } from "@/src/lib/server/uploadStorage";

function validId(id) {
  return /^[0-9a-f-]{36}$/.test(id);
}

export async function GET(_request, { params }) {
  const userId = await authenticatedUserId();
  const { id } = await params;
  if (!userId || !validId(id)) return new Response(null, { status: 404 });
  try {
    const { metadata, bytes } = await readUpload(userId, id);
    const contentType = metadata.mime === "text/html" ? "application/octet-stream" : metadata.mime;
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(metadata.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function DELETE(_request, { params }) {
  const userId = await authenticatedUserId();
  const { id } = await params;
  if (!userId || !validId(id)) return new Response(null, { status: 404 });
  try {
    await deleteUpload(userId, id);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 404 });
  }
}
