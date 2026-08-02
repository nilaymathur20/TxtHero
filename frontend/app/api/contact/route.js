import nodemailer from "nodemailer";
import { contactSchema, validateJson } from "@/src/lib/server/validation";

export async function POST(request) {
  const validated = await validateJson(request, contactSchema);
  if (validated.response) return validated.response;
  if (!process.env.SMTP_URL || !process.env.SUPPORT_EMAIL) {
    return Response.json({ error: "Support is unavailable" }, { status: 503 });
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({
    to: process.env.SUPPORT_EMAIL,
    from: process.env.SUPPORT_FROM_EMAIL || process.env.SUPPORT_EMAIL,
    replyTo: validated.data.email,
    subject: `[TxtHero] ${validated.data.subject}`,
    text: `From: ${validated.data.name}\n\n${validated.data.message}`,
  });
  return Response.json({ sent: true });
}
