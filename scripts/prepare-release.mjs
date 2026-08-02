import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [version, commit, branch, release] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || "")) throw new Error("release version must be numeric semver");
if (!/^[0-9a-f]{40}$/.test(commit || "")) throw new Error("commit must be a full Git SHA");
if (!branch || !release) throw new Error("branch and release tag are required");

const root = process.cwd();
for (const relative of ["package.json", "package-lock.json"]) {
  const file = path.join(root, relative);
  const data = JSON.parse(await readFile(file, "utf8"));
  data.version = version;
  if (data.packages?.[""]) data.packages[""].version = version;
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

await writeFile(path.join(root, "electron", "build-info.json"), `${JSON.stringify({
  commit,
  branch,
  builtAt: new Date().toISOString(),
  release,
}, null, 2)}\n`);
