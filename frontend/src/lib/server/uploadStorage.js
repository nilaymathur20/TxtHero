import "server-only";
import { chmod, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = process.env.TXTHERO_UPLOAD_DIR
  || path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads");

function userDirectory(userId) {
  if (!/^user_[A-Za-z0-9]+$/.test(userId)) throw new Error("invalid_user_id");
  return path.join(storageRoot, userId);
}

export async function ensureUserDirectory(userId) {
  const directory = userDirectory(userId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  return directory;
}

export async function storeUpload(userId, id, bytes, metadata) {
  const directory = await ensureUserDirectory(userId);
  await writeFile(path.join(directory, id), bytes, { mode: 0o600, flag: "wx" });
  await writeFile(path.join(directory, `${id}.json`), JSON.stringify(metadata), { mode: 0o600, flag: "wx" });
}

export async function listUploads(userId) {
  const directory = await ensureUserDirectory(userId);
  const entries = await readdir(directory);
  const metadata = await Promise.all(entries.filter((name) => /^[0-9a-f-]{36}\.json$/.test(name)).map(async (name) => {
    try { return { id: name.slice(0, -5), ...JSON.parse(await readFile(path.join(directory, name), "utf8")) }; } catch { return null; }
  }));
  return metadata.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readUpload(userId, id) {
  const directory = userDirectory(userId);
  return {
    metadata: JSON.parse(await readFile(path.join(directory, `${id}.json`), "utf8")),
    bytes: await readFile(path.join(directory, id)),
  };
}

export async function deleteUpload(userId, id) {
  const directory = userDirectory(userId);
  await Promise.all([
    rm(path.join(directory, id), { force: true }),
    rm(path.join(directory, `${id}.json`), { force: true }),
  ]);
}
