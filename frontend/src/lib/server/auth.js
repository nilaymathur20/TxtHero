import "server-only";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "node:path";
import { headers } from "next/headers";

import fs from "node:fs";

const directory = process.env.TXTHERO_USER_DATA_DIR || path.join(process.cwd(), "storage");
const dbFile = path.join(directory, "auth.db");

if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory, { recursive: true });
}

// Using better-sqlite3 for better-auth
const db = new Database(dbFile);

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true
  }
});

export async function authenticatedUserId() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id || null;
  } catch (error) {
    return null;
  }
}
