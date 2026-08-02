import { authenticatedUserId } from "@/src/lib/server/auth";
import { getUser, updatePreferences } from "@/src/lib/server/userStore";
import { preferencesSchema, validateJson } from "@/src/lib/server/validation";

export async function GET() {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUser(userId);
  return Response.json({ preferences: user?.preferences || {} });
}

export async function POST(request) {
  const userId = await authenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const validated = await validateJson(request, preferencesSchema);
  if (validated.response) return validated.response;
  return Response.json({ preferences: await updatePreferences(userId, validated.data) });
}
