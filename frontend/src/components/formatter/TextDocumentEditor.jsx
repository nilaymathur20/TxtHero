"use client";

export default function TextDocumentEditor({ model, onChange }) {
  return (
    <textarea
      className="document-editor"
      value={model.data}
      onChange={(event) => onChange({ ...model, data: event.target.value })}
    />
  );
}
