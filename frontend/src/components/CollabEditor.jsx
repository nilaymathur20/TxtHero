"use client";

/** Assemble identity, Yjs transport, TipTap, presence, sharing, and notifications. */
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Copy, FileText, Radio, Users } from "lucide-react";
import api from "../lib/api";
import Editor from "./Editor";
import TitleBar from "./TitleBar";
import UserPresence from "./UserPresence";
import useLocalIdentity from "../hooks/useLocalIdentity";
import { useCollab } from "../hooks/useCollab";

export default function CollabEditor({ documentId: suppliedDocumentId }) {
  const [documentId, setDocumentId] = useState(suppliedDocumentId || "");
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState("");
  const [showLobby, setShowLobby] = useState(!suppliedDocumentId);
  const [joinCode, setJoinCode] = useState("");
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (suppliedDocumentId) return;
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      if (/^[0-9]{15}$/.test(room)) {
        setDocumentId(room);
        setShowLobby(false);
      }
      else setError("This Live session number is invalid.");
      return;
    }
    api.post("/collab/sessions")
      .then(({ data }) => {
        setDocumentId(data.session_id);
        setExpiresAt(data.expires_at);
      })
      .catch(() => setError("A secure Live session could not be created."));
  }, [suppliedDocumentId]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("txthero-live-recent") || "[]").slice(0, 4)); } catch { setRecent([]); }
  }, []);
  const localIdentity = useLocalIdentity();
  const collab = useCollab(documentId, localIdentity.identity);

  const openSession = (sessionId) => {
    const normalized = sessionId.replace(/\s/g, "");
    if (!/^[0-9]{15}$/.test(normalized)) {
      setError("Enter a valid 15-digit Live address.");
      return;
    }
    const nextRecent = [
      { id: normalized, openedAt: Date.now() },
      ...recent.filter((item) => item.id !== normalized),
    ].slice(0, 4);
    localStorage.setItem("txthero-live-recent", JSON.stringify(nextRecent));
    setRecent(nextRecent);
    setError("");
    setDocumentId(normalized);
    setShowLobby(false);
    window.history.pushState(null, "", `/collab?room=${normalized}`);
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(documentId);
  };

  if (!documentId || !localIdentity.identity) return <main className="collab-loading">Creating a random secure session…</main>;
  if (showLobby) return (
    <main className="live-lobby">
      <section className="live-address-panel">
        <div className="live-lobby-title">
          <span><Radio size={20} /></span>
          <div><small>TXTHERO LIVE</small><h1>Collaborate in real time</h1></div>
        </div>
        <p>Share your address to invite someone, or enter theirs to join an existing document.</p>
        <div className="live-address-label">Your Live address</div>
        <div className="live-address-row">
          <strong>{documentId.match(/.{1,3}/g)?.join(" ")}</strong>
          <button onClick={copyAddress} title="Copy Live address"><Copy size={17} /></button>
        </div>
        <div className="live-secure-note"><span /> Ready for a secure one-hour session</div>
      </section>

      <section className="live-connect-panel">
        <div>
          <small>REMOTE ADDRESS</small>
          <h2>Join a live document</h2>
          <p>Ask your collaborator for their 15-digit Live address.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); openSession(joinCode); }}>
          <Users size={18} />
          <input
            value={joinCode}
            onChange={(event) => { setJoinCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 19)); setError(""); }}
            inputMode="numeric"
            placeholder="000 000 000 000 000"
            aria-label="Remote Live address"
          />
          <button type="submit">Connect <ArrowRight size={16} /></button>
        </form>
        {error && <div className="live-join-error">{error}</div>}
        <button className="live-host-button" onClick={() => openSession(documentId)}>
          <FileText size={16} /> Open your document
        </button>
      </section>

      <section className="live-recent-panel">
        <header><div><Clock3 size={16} /><strong>Recent sessions</strong></div><span>Stored only on this device</span></header>
        {recent.length ? (
          <div className="live-recent-list">
            {recent.map((item) => (
              <button key={item.id} onClick={() => openSession(item.id)}>
                <span><FileText size={17} /></span>
                <div><strong>{item.id.match(/.{1,3}/g)?.join(" ")}</strong><small>Live document</small></div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="live-no-recent"><Clock3 size={22} /><span>Your recently opened Live documents will appear here.</span></div>
        )}
      </section>
    </main>
  );
  if (error) return <main className="collab-loading">{error}</main>;
  return (
    <main className="collab-shell">
      <TitleBar documentId={documentId} expiresAt={expiresAt} connection={collab} />
      <section className="collab-body">
        <aside><UserPresence users={collab.users} identity={localIdentity.identity} onRename={localIdentity.setDisplayName} /></aside>
        <div className="collab-workspace"><Editor documentId={documentId} session={collab} identity={localIdentity.identity} /></div>
      </section>
      {collab.notice && <div className="collab-toast" key={collab.notice.id}>{collab.notice.text}</div>}
      <Toaster position="bottom-right" />
    </main>
  );
}
