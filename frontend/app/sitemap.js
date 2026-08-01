export default function sitemap() {
  const base = process.env.SITE_URL || "https://example.com";
  return ["", "/privacy", "/terms", "/cookies", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.5 : 1,
  }));
}
