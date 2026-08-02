"use client";

import { X } from "lucide-react";

export default function FormatSettingsPanel({ open, options, onChange, onClose }) {
  if (!open) return null;
  return (
    <aside className="format-settings" aria-label="Formatting settings">
      <header><strong>Formatting settings</strong><button aria-label="Close settings" onClick={onClose}><X size={17} /></button></header>
      <label>Print width<input type="number" min="40" max="200" value={options.printWidth} onChange={(event) => onChange({ ...options, printWidth: Number(event.target.value) })} /></label>
      <label>Tab width<select value={options.tabWidth} onChange={(event) => onChange({ ...options, tabWidth: Number(event.target.value) })}><option>2</option><option>4</option><option>8</option></select></label>
      <label><input type="checkbox" checked={options.semi} onChange={(event) => onChange({ ...options, semi: event.target.checked })} />Semicolons</label>
      <label><input type="checkbox" checked={options.singleQuote} onChange={(event) => onChange({ ...options, singleQuote: event.target.checked })} />Single quotes</label>
    </aside>
  );
}
