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
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
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

export default function Editor({ documentId, session, identity }) {
  const [fontSize, setFontSize] = useState(16);
  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({ codeBlock: false, undoRedo: documentId ? false : {} }),
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      FontFamily, Underline, Highlight, Placeholder.configure({ placeholder: "Start writing something wonderful…" }),
      CollaborativeCodeBlock,
    ];
    if (documentId && session?.ydoc && session?.provider) base.push(
      Collaboration.configure({ document: session.ydoc }),
      CollaborationCaret.configure({ provider: session.provider, user: identity }),
    );
    return base;
  }, [documentId, session?.ydoc, session?.provider, identity?.id]);

  const editor = useEditor({ immediatelyRender: false, extensions, editorProps: { attributes: { class: "collab-tiptap" } } }, [extensions]);
  useEffect(() => { if (editor && identity && documentId) editor.commands.updateUser(identity); }, [editor, identity, documentId]);

  if (documentId && !session?.ydoc) return <div className="collab-loading">Connecting and loading the latest CRDT state…</div>;
  if (!editor) return <div className="collab-loading">Preparing editor…</div>;
  return (
    <div className="rich-editor" style={{ "--editor-font-size": `${fontSize}px` }}>
      <Toolbar editor={editor} fontSize={fontSize} onFontSize={setFontSize} />
      <div className="collab-paper"><EditorContent editor={editor} /></div>
      <StatusBar editor={editor} />
    </div>
  );
}
