import "server-only";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const allowed = new Set(["application/pdf", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg"]);
export async function validateUpload(file) { if (!file || file.size > MAX_UPLOAD_BYTES) throw new Error("size"); if (path.isAbsolute(file.name) || file.name.includes("..") || /[\\/]/.test(file.name)) throw new Error("filename"); const bytes = Buffer.from(await file.arrayBuffer()); const detected = await fileTypeFromBuffer(bytes); if (!detected || !allowed.has(detected.mime) || detected.mime === "text/html") throw new Error("mime"); return { bytes, mime: detected.mime, extension: detected.ext }; }
