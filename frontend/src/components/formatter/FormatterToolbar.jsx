"use client";
import { Download, Settings2, Sparkles } from "lucide-react";

export default function FormatterToolbar({ onFormat, onDownload, onSettings, disabled, parser }) {
  return (
    <header className="format-toolbar">
      <div><strong>TxtHero Format</strong><span>Universal workspace</span></div>
      <div>
        <label className="format-type"><span>Type</span><select value={parser || "binary"} disabled><option>{parser || "binary"}</option></select></label>
        <button onClick={onFormat} disabled={disabled || !parser}><Sparkles size={16} />Format <kbd>Ctrl S</kbd></button>
        <button onClick={onDownload} disabled={disabled}><Download size={16} />Download <kbd>Ctrl D</kbd></button>
        <button onClick={onSettings} title="Formatting settings"><Settings2 size={17} /></button>
      </div>
    </header>
  );
}
