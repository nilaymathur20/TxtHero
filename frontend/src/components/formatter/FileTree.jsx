"use client";
import { FileCode2, Plus, X } from "lucide-react";
import { useRef } from "react";

export default function FileTree({ files, selected, onSelect, onAdd, onRemove }) {
  const input = useRef(null);
  return (
    <aside className="format-file-tree">
      <div className="format-tree-heading"><h2>Project files</h2><button aria-label="Add files" onClick={() => input.current?.click()}><Plus size={15} /></button></div>
      <input ref={input} type="file" multiple hidden onChange={(event) => { onAdd(Array.from(event.target.files || [])); event.target.value = ""; }} />
      {files.map((file, index) => (
        <div className={`format-tree-file ${index === selected ? "active" : ""}`} key={`${file.name}-${index}`}>
          <button onClick={() => onSelect(index)}><FileCode2 size={15} /><span>{file.name}</span></button>
          <button aria-label={`Remove ${file.name}`} onClick={() => onRemove(index)}><X size={14} /></button>
        </div>
      ))}
    </aside>
  );
}
