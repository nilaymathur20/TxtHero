"use client";

/** Formatting controls for rich text, fonts, and collaborative code blocks. */
import { Bold, Code2, Highlighter, Italic, Underline } from "lucide-react";
import { useCallback } from "react";
import FontSelector from "./FontSelector";
import SizeSelector from "./SizeSelector";
import TextColorPicker from "./TextColorPicker";

export default function Toolbar({ editor, fontSize, onFontSize }) {
  const changeFont = useCallback((font) => editor?.chain().focus().setFontFamily(font.stack).run(), [editor]);
  if (!editor) return <div className="collab-toolbar" />;
  const format = (name, command) => <button className={editor.isActive(name) ? "selected" : ""} onClick={() => command()} aria-label={name}>{name === "bold" ? <Bold size={17} /> : name === "italic" ? <Italic size={17} /> : name === "underline" ? <Underline size={17} /> : <Highlighter size={17} />}</button>;
  return (
    <div className="collab-toolbar">
      <FontSelector onChange={changeFont} />
      <SizeSelector value={fontSize} onChange={onFontSize} />
      <span className="divider" />
      {format("bold", () => editor.chain().focus().toggleBold().run())}
      {format("italic", () => editor.chain().focus().toggleItalic().run())}
      {format("underline", () => editor.chain().focus().toggleUnderline().run())}
      {format("highlight", () => editor.chain().focus().toggleHighlight().run())}
      <TextColorPicker editor={editor} />
      <button className={editor.isActive("codeBlock") ? "selected" : ""} onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Code block" title="Code block (Ctrl/⌘+Shift+C)"><Code2 size={18} /></button>
    </div>
  );
}
