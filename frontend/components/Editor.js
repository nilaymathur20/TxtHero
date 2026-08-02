"use client";

import {
  Bold, Check, ChevronDown, FilePlus2, FileText, FolderOpen, Italic,
  Menu, PanelLeftClose, Save, Search, Trash2, Underline, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const DEFAULT_STYLE = { font_family: "Inter", font_size: 16, bold: false, italic: false, underline: false };

export default function Editor() {
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("Untitled");
  const [files, setFiles] = useState([]);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [sidebar, setSidebar] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Ready");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef(null);
  const draftRequest = useRef(null);
  const editRevision = useRef(0);

  const markEdited = () => {
    editRevision.current += 1;
    setDirty(true);
  };

  const cancelPendingDraft = () => {
    editRevision.current += 1;
    clearTimeout(saveTimer.current);
    draftRequest.current?.abort();
    return editRevision.current;
  };

  const refreshFiles = useCallback(async () => {
    const result = await api.getFiles();
    setFiles(result.files);
  }, []);

  useEffect(() => {
    Promise.all([api.getContent(), api.getStyle(), api.getFiles()])
      .then(([document, savedStyle, fileList]) => {
        setContent(document.content);
        setFilename(document.filename);
        setStyle({ ...DEFAULT_STYLE, ...savedStyle });
        setFiles(fileList.files);
      })
      .catch(() => setError("The editor could not reach the API. Start the backend on port 8000."));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    clearTimeout(saveTimer.current);
    setStatus("Saving draft…");
    const revision = editRevision.current;
    saveTimer.current = setTimeout(() => {
      const controller = new AbortController();
      draftRequest.current = controller;
      api.updateContent(content, { signal: controller.signal })
        .then(() => {
          if (editRevision.current === revision) setStatus("Draft saved");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          if (editRevision.current === revision) setStatus("Draft not saved");
        });
    }, 650);
    return () => {
      clearTimeout(saveTimer.current);
      draftRequest.current?.abort();
    };
  }, [content, dirty]);

  const updateFormatting = async (patch) => {
    const next = { ...style, ...patch };
    setStyle(next);
    try { await api.updateStyle(patch); } catch { setError("Formatting could not be saved."); }
  };

  const save = async () => {
    const name = filename.trim() || "Untitled";
    const revision = cancelPendingDraft();
    setStatus("Saving…");
    try {
      const result = await api.saveFile(name, content);
      if (editRevision.current === revision) {
        setFilename(result.filename);
        setDirty(false);
        setStatus("Saved");
      }
      await refreshFiles();
    } catch (err) { setError(err.message); setStatus("Save failed"); }
  };

  const newDocument = async () => {
    if (dirty && !window.confirm("Discard the unsaved changes in this draft?")) return;
    const revision = cancelPendingDraft();
    try {
      await api.clear();
      if (editRevision.current === revision) {
        setContent(""); setFilename("Untitled"); setDirty(false); setStatus("New document");
      }
    } catch (err) { setError(err.message); }
  };

  const openFile = async (name) => {
    if (dirty && !window.confirm("Discard the unsaved changes in this draft?")) return;
    const revision = cancelPendingDraft();
    try {
      const result = await api.loadFile(name);
      if (editRevision.current === revision) {
        setContent(result.content); setFilename(result.filename); setDirty(false); setStatus("Opened");
      }
    } catch (err) { setError(err.message); }
  };

  const removeFile = async (event, name) => {
    event.stopPropagation();
    if (!window.confirm(`Delete ${name}?`)) return;
    try { await api.deleteFile(name); await refreshFiles(); }
    catch (err) { setError(err.message); }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const visibleFiles = files.filter((file) => file.filename.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">T</span><span>TxtHero</span></div>
          <button className="new-button" onClick={newDocument}><FilePlus2 size={18} /> New document</button>
          <div className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" /></div>
          <div className="section-title"><span>Your documents</span><span>{files.length}</span></div>
          <div className="file-list">
            {visibleFiles.map((file) => (
              <button className={`file-item ${file.filename === filename ? "active" : ""}`} onClick={() => openFile(file.filename)} key={file.filename}>
                <FileText size={17} /><span>{file.filename}</span><Trash2 className="delete" size={15} onClick={(e) => removeFile(e, file.filename)} />
              </button>
            ))}
            {!visibleFiles.length && <div className="empty"><FolderOpen size={25} /><span>No saved documents yet</span></div>}
          </div>
          <div className="sidebar-footer"><span className="avatar">N</span><div><strong>My workspace</strong><small>Local documents</small></div></div>
        </aside>
      )}

      <section className="workspace">
        <header className="topbar">
          <div className="document-identity">
            <button className="icon-button" aria-label="Toggle sidebar" onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelLeftClose size={19} /> : <Menu size={20} />}</button>
            <input value={filename} onChange={(e) => { setFilename(e.target.value); markEdited(); }} aria-label="Document name" />
            <span className="save-state"><Check size={13} /> {status}</span>
          </div>
          <button className="save-button" onClick={save}><Save size={17} /> Save document</button>
        </header>

        <div className="toolbar" role="toolbar" aria-label="Text formatting">
          <label className="select-wrap"><select value={style.font_family} onChange={(e) => updateFormatting({ font_family: e.target.value })}><option>Inter</option><option>Georgia</option><option>Helvetica</option><option>Courier New</option></select><ChevronDown size={14} /></label>
          <label className="select-wrap size"><select value={style.font_size} onChange={(e) => updateFormatting({ font_size: Number(e.target.value) })}>{[12,14,16,18,20,24,28,32].map((n) => <option key={n}>{n}</option>)}</select><ChevronDown size={14} /></label>
          <span className="divider" />
          <button className={style.bold ? "selected" : ""} onClick={() => updateFormatting({ bold: !style.bold })} aria-label="Bold"><Bold size={17} /></button>
          <button className={style.italic ? "selected" : ""} onClick={() => updateFormatting({ italic: !style.italic })} aria-label="Italic"><Italic size={17} /></button>
          <button className={style.underline ? "selected" : ""} onClick={() => updateFormatting({ underline: !style.underline })} aria-label="Underline"><Underline size={17} /></button>
        </div>

        {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}
        <div className="canvas-wrap">
          <div className="paper">
            <textarea
              autoFocus value={content} placeholder="Start writing something wonderful…"
              onChange={(e) => { setContent(e.target.value); markEdited(); }}
              style={{ fontFamily: style.font_family, fontSize: `${style.font_size}px`, fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? "italic" : "normal", textDecoration: style.underline ? "underline" : "none" }}
            />
          </div>
        </div>
        <footer className="statusbar"><span>{words} {words === 1 ? "word" : "words"}</span><span>{content.length} characters</span><span>{Math.max(1, Math.ceil(words / 220))} min read</span></footer>
      </section>
    </main>
  );
}
