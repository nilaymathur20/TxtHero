/** Maps extensions to parsers, editor experiences, formatters, and exporters. */
export const FORMATTERS = {
  javascript: { extensions: ["js", "jsx", "mjs", "cjs"], parser: "babel", editor: "code", exporter: "text" },
  flow: { extensions: ["flow"], parser: "flow", editor: "code", exporter: "text" },
  typescript: { extensions: ["ts", "tsx", "mts", "cts"], parser: "typescript", editor: "code", exporter: "text" },
  json: { extensions: ["json", "json5", "jsonc"], parser: "json", editor: "code", exporter: "text" },
  css: { extensions: ["css", "scss", "less"], parser: "css", editor: "code", exporter: "text" },
  html: { extensions: ["html", "htm", "vue"], parser: "html", editor: "code", exporter: "text" },
  angular: { extensions: ["component.html"], parser: "angular", editor: "code", exporter: "text" },
  glimmer: { extensions: ["hbs", "handlebars"], parser: "glimmer", editor: "code", exporter: "text" },
  markdown: { extensions: ["md", "mdx"], parser: "markdown", editor: "code", exporter: "text" },
  yaml: { extensions: ["yaml", "yml"], parser: "yaml", editor: "code", exporter: "text" },
  graphql: { extensions: ["graphql", "gql"], parser: "graphql", editor: "code", exporter: "text" },
  office: { extensions: ["docx", "pptx", "xlsx"], parser: "office", editor: "document", exporter: "office" },
  pdf: { extensions: ["pdf"], parser: "pdf", editor: "document", exporter: "pdf" },
};

export function getFormatDescriptor(filename) {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  if (filename.toLowerCase().endsWith(".component.html")) return FORMATTERS.angular;
  if (extension === "json5") return { ...FORMATTERS.json, parser: "json5" };
  if (extension === "jsonc") return { ...FORMATTERS.json, parser: "json-stringify" };
  return Object.entries(FORMATTERS).find(([, item]) => item.extensions.includes(extension))?.[1] || { extensions: [extension], parser: null, editor: "binary", exporter: "original" };
}
