const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Something went wrong");
  }
  return response.json();
}

export const api = {
  getContent: () => request("/content"),
  updateContent: (content, options = {}) => request("/content", { ...options, method: "POST", body: JSON.stringify({ content }) }),
  clear: () => request("/clear", { method: "POST" }),
  getFiles: () => request("/files"),
  saveFile: (filename, content) => request("/files/save", { method: "POST", body: JSON.stringify({ filename, content }) }),
  loadFile: (filename) => request(`/files/load/${encodeURIComponent(filename)}`),
  deleteFile: (filename) => request(`/files/${encodeURIComponent(filename)}`, { method: "DELETE" }),
  getStyle: () => request("/style"),
  updateStyle: (style) => request("/style", { method: "POST", body: JSON.stringify(style) }),
};
