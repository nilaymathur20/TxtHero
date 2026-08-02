"use client";

/** Main TipTap editor: rich text alone, or Yjs CRDT editing when given a room ID. */
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Color from "@tiptap/extension-color";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import CodeBlock from "./CodeBlock";
import StatusBar from "./StatusBar";
import Toolbar from "./Toolbar";
import { lowlight } from "../lib/lowlight";

const CollaborativeCodeBlock = CodeBlockLowlight.extend({
  addNodeView() { return ReactNodeViewRenderer(CodeBlock); },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCodeBlock(),
      Tab: () => this.editor.isActive("codeBlock") && this.editor.commands.insertContent("  "),
    };
  },
}).configure({ lowlight, defaultLanguage: "plaintext", enableTabIndentation: false });

export default function Editor({ documentId, session, identity, role = "editor" }) {
  const [fontSize, setFontSize] = useState(16);
  const typingTimer = useRef(null);
  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({ codeBlock: false, undoRedo: documentId ? false : {} }),
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      FontFamily, Highlight, Placeholder.configure({ placeholder: "Start writing something wonderful…" }),
      CollaborativeCodeBlock,
    ];
    if (documentId && session?.ydoc && session?.provider) base.push(
      Collaboration.configure({ document: session.ydoc }),
      CollaborationCaret.configure({ provider: session.provider, user: identity }),
    );
    return base;
  }, [documentId, session?.ydoc, session?.provider, identity?.id]);

  const editor = useEditor({ immediatelyRender: false, extensions, editable: role !== "viewer", editorProps: { attributes: { class: "collab-tiptap" } } }, [extensions]);
  useEffect(() => { if (editor && identity && documentId) editor.commands.updateUser(identity); }, [editor, identity, documentId]);
  useEffect(() => { editor?.setEditable(role !== "viewer"); }, [editor, role]);
  useEffect(() => {
    if (!editor || !session?.awareness) return undefined;
    const onUpdate = () => {
      session.awareness.setLocalStateField("activity", { status: "typing" });
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => session.awareness.setLocalStateField("activity", { status: "online" }), 1200);
    };
    editor.on("update", onUpdate);
    return () => { editor.off("update", onUpdate); window.clearTimeout(typingTimer.current); };
  }, [editor, session?.awareness]);

  if (!editor) return <div className="collab-loading">Preparing editor…</div>;
  return (
    <div className="rich-editor" style={{ "--editor-font-size": `${fontSize}px` }}>
      {role !== "viewer" && <Toolbar editor={editor} fontSize={fontSize} onFontSize={setFontSize} />}
      {role === "viewer" && <div className="collab-viewer-banner">View only · the host can grant editing access</div>}
      <div className="collab-paper"><EditorContent editor={editor} /></div>
      <StatusBar editor={editor} />
    </div>
  );
}
