"use client";

import BinaryEditor from "./BinaryEditor";
import PdfEditor from "./PdfEditor";
import SlideEditor from "./SlideEditor";
import SpreadsheetEditor from "./SpreadsheetEditor";
import TextDocumentEditor from "./TextDocumentEditor";
import WordEditor from "./WordEditor";

export default function DocumentEditor({ model, onChange }) {
  if (model.kind === "spreadsheet") return <SpreadsheetEditor model={model} onChange={onChange} />;
  if (model.kind === "slides") return <SlideEditor model={model} onChange={onChange} />;
  if (model.kind === "document") return <WordEditor model={model} onChange={onChange} />;
  if (model.kind === "pdf") return <PdfEditor model={model} onChange={onChange} />;
  if (model.kind === "text") return <TextDocumentEditor model={model} onChange={onChange} />;
  return <BinaryEditor />;
}
