"use client";

import { FilePlusCorner, FileText, FolderOpen, Menu, PanelLeftClose, Save, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import api from "@/src/lib/api";
import FontSelector from "./FontSelector";
import Skeleton from "./ui/Skeleton";

const defaultStyle = { font_family: "Inter", font_stack: "'Inter', sans-serif", font_size: 16, color: "#332f2b", bold: false, italic: false, underline: false };

export default function SoloWorkspace() {
  const [content, setContent] = useState("");
  const [filename, setFilename] = useState("Untitled");
  const [files, setFiles] = useState([]);
  const [style, setStyle] = useState(defaultStyle);
  const [sidebar, setSidebar] = useState(true);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  const refreshFiles = useCallback(async () => {
    const { data } = await api.get("/files");
    setFiles(data.files);
  }, []);

  useEffect(() => {
    Promise.all([api.get("/content"), api.get("/style"), api.get("/files")])
      .then(([contentResponse, styleResponse, fileResponse]) => {
        setContent(contentResponse.data.content);
        setFilename(contentResponse.data.filename);
        setStyle({ ...defaultStyle, ...styleResponse.data });
        setFiles(fileResponse.data.files);
      })
      .catch(() => toast.error("TxtHero could not load your local workspace."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.post("/content", { content }).catch(() => toast.error("Draft autosave failed."));
    }, 650);
    return () => window.clearTimeout(saveTimer.current);
  }, [content, dirty]);

  useEffect(() => {
    window.txthero?.setUnsavedChanges?.(dirty);
    return () => window.txthero?.setUnsavedChanges?.(false);
  }, [dirty]);

  const save = async () => {
    try {
      const { data } = await api.post("/files/save", { filename: filename.trim() || "Untitled", content });
      setFilename(data.filename);
      setDirty(false);
      await refreshFiles();
      toast.success("Document saved");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Document could not be saved.");
    }
  };

  const createDocument = async () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    await api.post("/clear");
    setContent("");
    setFilename("Untitled");
    setDirty(false);
  };

  const openDocument = async (name) => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    const { data } = await api.get(`/files/load/${encodeURIComponent(name)}`);
    setContent(data.content);
    setFilename(data.filename);
    setDirty(false);
  };

  const deleteDocument = async (event, name) => {
    event.stopPropagation();
    if (!window.confirm(`Delete ${name}?`)) return;
    await api.delete(`/files/${encodeURIComponent(name)}`);
    await refreshFiles();
    toast.success("Document deleted");
  };

  const updateStyle = async (patch) => {
    const next = { ...style, ...patch };
    setStyle(next);
    try {
      await api.post("/style", patch);
    } catch {
      toast.error("Formatting preference could not be saved.");
    }
  };

  const visibleFiles = files.filter((file) => file.filename.toLowerCase().includes(query.toLowerCase()));
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <main className="app-shell">
      {sidebar && (
        <aside className="sidebar">
          <button className="new-button" onClick={createDocument}><FilePlusCorner size={18} />New document</button>
          <label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" /></label>
          <div className="section-title"><span>Your documents</span><span>{files.length}</span></div>
          <div className="file-list">
            {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton className="mb-2 h-9 bg-white/10" key={index} />) : visibleFiles.map((file) => (
              <button key={file.filename} className={`file-item ${file.filename === filename ? "active" : ""}`} onClick={() => openDocument(file.filename)}>
                <FileText size={17} /><span>{file.filename}</span><Trash2 className="delete" size={15} onClick={(event) => deleteDocument(event, file.filename)} />
              </button>
            ))}
            {!loading && !visibleFiles.length && <div className="empty"><FolderOpen size={25} /><span>No saved documents yet</span></div>}
          </div>
        </aside>
      )}
      <section className="workspace">
        <header className="topbar">
          <div className="document-identity">
            <button className="icon-button" aria-label="Toggle sidebar" onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelLeftClose size={19} /> : <Menu size={20} />}</button>
            <input value={filename} onChange={(event) => { setFilename(event.target.value); setDirty(true); }} aria-label="Document name" />
            <span className="save-state">{dirty ? "Unsaved changes" : "Saved"}</span>
          </div>
          <button className="save-button" onClick={save}><Save size={17} />Save document</button>
        </header>
        <div className="toolbar" role="toolbar" aria-label="Text formatting">
          <FontSelector value={style.font_family} onChange={(font) => updateStyle({ font_family: font.name, font_stack: font.stack })} />
          <select value={style.font_size} onChange={(event) => updateStyle({ font_size: Number(event.target.value) })} aria-label="Font size">
            {[12, 14, 16, 18, 20, 24, 28, 32].map((size) => <option key={size}>{size}</option>)}
          </select>
          <label className="solo-color-picker" title="Document text color">
            <span style={{ backgroundColor: style.color }} />
            <input type="color" value={style.color} onInput={(event) => updateStyle({ color: event.currentTarget.value })} aria-label="Document text color" />
          </label>
          {["bold", "italic", "underline"].map((name) => <button key={name} className={style[name] ? "selected" : ""} onClick={() => updateStyle({ [name]: !style[name] })}>{name[0].toUpperCase()}</button>)}
        </div>
        <div className="canvas-wrap">
          <div className="paper">
            {loading ? <div className="p-16"><Skeleton className="mb-4 h-5 w-2/3" /><Skeleton className="mb-4 h-5" /><Skeleton className="h-5 w-4/5" /></div> : (
              <textarea
                autoFocus
                value={content}
                placeholder="Start writing something wonderful…"
                onChange={(event) => { setContent(event.target.value); setDirty(true); }}
                style={{ color: style.color, fontFamily: style.font_stack || style.font_family, fontSize: `${style.font_size}px`, fontWeight: style.bold ? 700 : 400, fontStyle: style.italic ? "italic" : "normal", textDecoration: style.underline ? "underline" : "none" }}
              />
            )}
          </div>
        </div>
        <footer className="statusbar"><span>{words} words</span><span>{content.length} characters</span><span>{Math.max(1, Math.ceil(words / 220))} min read</span></footer>
      </section>
      <Toaster position="bottom-right" />
    </main>
  );
}
