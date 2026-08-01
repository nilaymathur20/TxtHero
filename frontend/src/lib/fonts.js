/** Helpers for applying fonts without loading every Google Font at startup. */
const loadedFonts = new Set();

export function loadGoogleFont(font) {
  if (!font?.google || !font.import_url || loadedFonts.has(font.name) || typeof document === "undefined") return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.import_url;
  link.dataset.txtheroFont = font.name;
  document.head.appendChild(link);
  loadedFonts.add(font.name);
}

export function rememberFont(font) {
  window.localStorage.setItem("txthero-font", JSON.stringify(font));
}

export function getRememberedFont() {
  try { return JSON.parse(window.localStorage.getItem("txthero-font")); } catch { return null; }
}
