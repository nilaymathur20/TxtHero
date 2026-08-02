import "server-only";
export function logRejected(request, rule) {
  // Never log request bodies: they may contain credentials or private content.
  const forwarded = request.headers.get("x-forwarded-for");
  console.warn(JSON.stringify({
    type: "rejected_submission",
    timestamp: new Date().toISOString(),
    ip: forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown",
    userAgent: (request.headers.get("user-agent") || "unknown").slice(0, 512),
    rule,
  }));
}
