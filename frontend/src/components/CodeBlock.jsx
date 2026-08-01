"use client";

/** TipTap node view with language selection, line numbers, and copy support. */
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export const CODE_LANGUAGES = ["plaintext", "python", "javascript", "typescript", "html", "css", "json", "bash", "shell", "sql", "rust", "go", "java", "c", "cpp", "csharp", "ruby", "php", "swift", "kotlin", "markdown", "yaml", "toml", "xml", "dockerfile", "makefile"];

export default function CodeBlock({ node, updateAttributes }) {
  const [copied, setCopied] = useState(false);
  const lines = Math.max(1, node.textContent.split("\n").length);
  const copy = async () => {
    await navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <NodeViewWrapper className="tx-code-block">
      <div className="tx-code-header" contentEditable={false}>
        <select value={node.attrs.language || "plaintext"} onChange={(event) => updateAttributes({ language: event.target.value })} aria-label="Code language">
          {CODE_LANGUAGES.map((language) => <option value={language} key={language}>{language}</option>)}
        </select>
        <button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
      </div>
      <div className="tx-code-body">
        <div className="tx-line-numbers" contentEditable={false}>{Array.from({ length: lines }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
        <pre><NodeViewContent as="code" /></pre>
      </div>
    </NodeViewWrapper>
  );
}
