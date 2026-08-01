"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Button from "./ui/Button";
import Skeleton from "./ui/Skeleton";

export default function PrivateFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const input = useRef(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/files", { cache: "no-store" });
    if (!response.ok) throw new Error("files");
    setFiles((await response.json()).files);
    setLoading(false);
  }, []);

  useEffect(() => { refresh().catch(() => { setLoading(false); toast.error("Private files could not be loaded"); }); }, [refresh]);

  const upload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/files", { method: "POST", body: form });
    if (!response.ok) return toast.error("Unsupported upload");
    await refresh();
    toast.success("File stored privately");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this private file?")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    await refresh();
    toast.success("File deleted");
  };

  return (
    <section className="private-files">
      <header><div><h2>Private files</h2><p>Authenticated, non-public storage with attachment-only downloads.</p></div><Button onClick={() => input.current?.click()}><Upload size={16} />Upload</Button></header>
      <input ref={input} type="file" hidden onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ""; }} />
      {loading ? <Skeleton className="h-24 w-full" /> : !files.length ? <p className="empty-private">No private files uploaded.</p> : (
        <ul>{files.map((file) => <li key={file.id}><div><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB · {new Date(file.createdAt).toLocaleDateString()}</small></div><a href={`/api/files/${file.id}`}><Download size={16} />Download</a><button aria-label={`Delete ${file.name}`} onClick={() => remove(file.id)}><Trash2 size={16} /></button></li>)}</ul>
      )}
      <Toaster position="bottom-right" />
    </section>
  );
}
