"use client";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

export default function CodeFileEditor({ source, formatted, onChange, language }) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "light";
  return <div className="format-split"><section><h3>Source</h3><Editor height="calc(100vh - 190px)" value={source} language={language} theme={theme} onChange={(value) => onChange(value || "")} /></section><section><h3>Formatted preview</h3><Editor height="calc(100vh - 190px)" value={formatted} language={language} theme={theme} options={{ readOnly: true }} /></section></div>;
}
