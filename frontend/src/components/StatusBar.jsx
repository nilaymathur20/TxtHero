"use client";

/** Show live writing statistics at the bottom of the editor. */
export default function StatusBar({ editor }) {
  const text = editor?.getText() || "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return <footer className="statusbar"><span>{words} words</span><span>{text.length} characters</span><span>{Math.max(1, Math.ceil(words / 220))} min read</span></footer>;
}
