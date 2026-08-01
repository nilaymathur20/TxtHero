export default function robots() {
  const base = process.env.SITE_URL || "https://example.com";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
