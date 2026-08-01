import "server-only";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = process.env.TXTHERO_USER_DATA_DIR || path.join(process.cwd(), "storage");
const file = path.join(directory, "users.json");

async function readUsers() {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return {}; }
}

async function writeUsers(users) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(users, null, 2), { mode: 0o600 });
  await rename(temporary, file);
}

export async function upsertUser(userId) {
  const users = await readUsers();
  const now = new Date().toISOString();
  users[userId] = {
    userId,
    plan: users[userId]?.plan || "free",
    preferences: users[userId]?.preferences || {},
    createdAt: users[userId]?.createdAt || now,
    updatedAt: now,
  };
  await writeUsers(users);
  return users[userId];
}

export async function getUser(userId) {
  return (await readUsers())[userId] || null;
}

export async function updatePreferences(userId, preferences) {
  const user = await upsertUser(userId);
  const users = await readUsers();
  users[userId] = {
    ...user,
    preferences: { ...user.preferences, ...preferences },
    updatedAt: new Date().toISOString(),
  };
  await writeUsers(users);
  return users[userId].preferences;
}

export async function deleteUser(userId) {
  const users = await readUsers();
  delete users[userId];
  await writeUsers(users);
}
