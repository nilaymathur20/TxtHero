import "server-only";
import { z } from "zod";
import { logRejected } from "./securityLog";

const safeDisplayText = z.string().min(1).max(100).refine(
  (value) => !/[<>]/.test(value),
  "display_html",
);

export const contactSchema = z.object({
  name: safeDisplayText,
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.enum(["General", "Bug Report"]),
  message: z.string().min(1).max(5000).refine((value) => !value.includes("\0"), "message_null"),
}).strict();

export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  formatter: z.object({
    printWidth: z.number().int().min(40).max(200).optional(),
    tabWidth: z.union([z.literal(2), z.literal(4), z.literal(8)]).optional(),
    semi: z.boolean().optional(),
    singleQuote: z.boolean().optional(),
  }).strict().optional(),
}).strict();

/**
 * Validate before business logic receives the payload. External callers always
 * receive one generic error while the server log retains the failed rule.
 */
export async function validateJson(request, schema) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    logRejected(request, "invalid_json");
    return { response: Response.json({ error: "Invalid request" }, { status: 400 }) };
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    logRejected(request, result.error.issues[0]?.message || "schema_validation");
    return { response: Response.json({ error: "Invalid request" }, { status: 400 }) };
  }
  return { data: result.data };
}
