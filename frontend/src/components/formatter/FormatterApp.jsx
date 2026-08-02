"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getFormatDescriptor } from "../../lib/formatterRegistry";
import { formatSource } from "../../lib/prettierFormatter";
import { exportDocument, parseDocument } from "../../lib/documentPipeline";
import UploadZone from "./UploadZone";
import FileTree from "./FileTree";
import FormatterToolbar from "./FormatterToolbar";
import CodeFileEditor from "./CodeFileEditor";
import DocumentEditor from "./DocumentEditor";
import FormatSettingsPanel from "./FormatSettingsPanel";
import ProcessingSkeleton from "./ProcessingSkeleton";

const defaultOptions = { printWidth: 100, tabWidth: 2, semi: true, singleQuote: false };

export default function FormatterApp() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [options, setOptions] = useState(defaultOptions);
  const current = files[selected];
  const hasUnsavedChanges = files.some((item) => item.dirty === true);

  useEffect(() => {
    try {
      setOptions({ ...defaultOptions, ...JSON.parse(localStorage.getItem("txthero-format-options")) });
    } catch {
      setOptions(defaultOptions);
    }
  }, []);

  useEffect(() => {
    window.txthero?.setUnsavedChanges?.(hasUnsavedChanges);
    return () => window.txthero?.setUnsavedChanges?.(false);
  }, [hasUnsavedChanges]);

  const updateOptions = (next) => {
    setOptions(next);
    localStorage.setItem("txthero-format-options", JSON.stringify(next));
  };

  const addFiles = useCallback(async (incoming) => {
    const accepted = incoming.slice(0, Math.max(0, 50 - files.length));
    if (!accepted.length) return;
    setProcessing(true);
    const parsed = [];
    for (const file of accepted) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50 MB`);
        continue;
      }
      try {
        const descriptor = getFormatDescriptor(file.name);
        if (descriptor.editor === "code") {
          const source = await file.text();
          parsed.push({ file, descriptor, source, formatted: source });
        } else {
          parsed.push({ file, descriptor, model: await parseDocument(file) });
        }
      } catch {
        toast.error(`${file.name} could not be parsed`);
      }
    }
    setFiles((items) => [...items, ...parsed]);
    if (parsed.length) toast.success(`${parsed.length} file${parsed.length === 1 ? "" : "s"} loaded`);
    setProcessing(false);
  }, [files.length]);

  const removeFile = (index) => {
    setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setSelected((value) => Math.max(0, Math.min(value, files.length - 2)));
  };

  const format = useCallback(async () => {
    if (!current || current.descriptor.editor !== "code") return toast("This file uses its type-specific editor");
    setProcessing(true);
    try {
      const formatted = await formatSource(current.source, current.descriptor.parser, options);
      setFiles((items) => items.map((item, index) => index === selected ? { ...item, formatted, dirty: true } : item));
      toast.success("Formatted");
    } catch {
      toast.error("Formatting failed; check the source syntax");
    } finally {
      setProcessing(false);
    }
  }, [current, selected, options]);

  const download = useCallback(async () => {
    if (!current) return;
    try {
      const blob = current.descriptor.editor === "code"
        ? new Blob([current.formatted], { type: "text/plain;charset=utf-8" })
        : await exportDocument(current.model, current.file.name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = current.file.name;
      link.click();
      setFiles((items) => items.map((item, index) => index === selected ? { ...item, dirty: false } : item));
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Download prepared");
    } catch {
      toast.error("Export failed; the original remains unchanged");
    }
  }, [current]);

  useEffect(() => {
    const key = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "s") { event.preventDefault(); format(); }
      if (event.key.toLowerCase() === "d") { event.preventDefault(); download(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [format, download]);

  return (
    <main className="formatter-app">
      <FormatterToolbar onFormat={format} onDownload={download} onSettings={() => setSettingsOpen(true)} disabled={!current || processing} parser={current?.descriptor.parser} />
      <div className="formatter-body">
        <FileTree files={files.map((item) => item.file)} selected={selected} onSelect={setSelected} onAdd={addFiles} onRemove={removeFile} />
        <div className="formatter-workspace">
          {processing ? <ProcessingSkeleton /> : !current ? <UploadZone onFiles={addFiles} /> : (
            <>
              {current.model?.warning && <div className="fidelity-warning">{current.model.warning}</div>}
              {current.descriptor.editor === "code"
                ? <CodeFileEditor source={current.source} formatted={current.formatted} language={current.descriptor.parser} onChange={(source) => setFiles((items) => items.map((item, index) => index === selected ? { ...item, source, dirty: true } : item))} />
                : <DocumentEditor model={current.model} onChange={(model) => setFiles((items) => items.map((item, index) => index === selected ? { ...item, model, dirty: true } : item))} />}
            </>
          )}
        </div>
        <FormatSettingsPanel open={settingsOpen} options={options} onChange={updateOptions} onClose={() => setSettingsOpen(false)} />
      </div>
      <Toaster position="bottom-right" />
    </main>
  );
}
