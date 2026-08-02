"use client";

/** Privacy-scoped Live lobby, session controls, Yjs transport, and editor. */
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Clock3, FileText, Radio, ShieldCheck, Users } from "lucide-react";
import { Toaster } from "react-hot-toast";
import api from "../lib/api";
import useLocalIdentity from "../hooks/useLocalIdentity";
import { useCollab } from "../hooks/useCollab";
import Editor from "./Editor";
import TitleBar from "./TitleBar";
import UserPresence from "./UserPresence";

const message = (error, fallback) => error.response?.data?.detail || fallback;

export default function CollabEditor() {
  const localIdentity = useLocalIdentity();
  const identity = localIdentity.identity;
  const [documentId, setDocumentId] = useState("");
  const [credential, setCredential] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [pendingRequest, setPendingRequest] = useState("");
  const [sessionView, setSessionView] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);
  const [settings, setSettings] = useState({ mode: "team", require_approval: true, expires_in_minutes: 120, max_participants: 10 });
  const collab = useCollab(documentId, identity, credential?.token);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("txthero-live-recent") || "[]").slice(0, 4)); } catch { setRecent([]); }
    const room = new URLSearchParams(window.location.search).get("room") || "";
    if (room) setJoinCode(room.replace(/\D/g, "").slice(0, 6));
  }, []);

  const remember = (code) => {
    const next = [{ id: code, openedAt: Date.now() }, ...recent.filter((item) => item.id !== code)].slice(0, 4);
    localStorage.setItem("txthero-live-recent", JSON.stringify(next));
    setRecent(next);
  };

  const createSession = async () => {
    if (!identity) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/collab/sessions", {
        host_id: identity.id, display_name: identity.name, color: identity.color, ...settings,
      });
      setDocumentId(data.session_id); setExpiresAt(data.expires_at);
      setCredential({ token: data.token, participantId: data.participant_id, role: "host" });
      remember(data.session_id);
      window.history.pushState(null, "", `/collab?room=${data.session_id}`);
    } catch (err) { setError(message(err, "A secure Live session could not be created.")); }
    finally { setBusy(false); }
  };

  const joinSession = async (event) => {
    event?.preventDefault();
    const code = joinCode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) return setError("Enter a valid 6-digit session code.");
    setBusy(true); setError("");
    try {
      const { data } = await api.post(`/collab/sessions/${code}/join`, {
        user_id: identity.id, display_name: identity.name, color: identity.color,
      });
      setDocumentId(code); setExpiresAt(data.expires_at); remember(code);
      if (data.status === "pending") setPendingRequest(data.request_id);
      else setCredential({ token: data.token, participantId: data.participant_id, role: "editor" });
    } catch (err) { setError(message(err, "The session could not be joined.")); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!pendingRequest) return undefined;
    const poll = async () => {
      try {
        const { data } = await api.get(`/collab/join-requests/${pendingRequest}`);
        if (data.status === "approved") {
          setCredential({ token: data.token, participantId: data.participant_id, role: "editor" });
          setPendingRequest("");
        } else if (data.status === "rejected") {
          setPendingRequest(""); setDocumentId(""); setError("The host declined your request to join.");
        }
      } catch (err) { setError(message(err, "The join request expired.")); setPendingRequest(""); }
    };
    poll(); const timer = window.setInterval(poll, 1500);
    return () => window.clearInterval(timer);
  }, [pendingRequest]);

  const refreshSession = useCallback(async () => {
    if (!documentId || !credential?.token) return;
    try {
      const { data } = await api.get(`/collab/sessions/${documentId}`, { headers: { Authorization: `Bearer ${credential.token}` } });
      setSessionView(data);
      const me = data.participants.find((item) => item.participant_id === credential.participantId);
      if (!me || me.status === "removed") { setError("You were removed from this session by the host."); setCredential(null); }
      else if (me.role !== credential.role) setCredential((current) => ({ ...current, role: me.role }));
    } catch (err) {
      setError(message(err, "The session is no longer available."));
      if (err.response?.status === 403) setCredential(null);
    }
  }, [documentId, credential?.token, credential?.participantId, credential?.role]);

  useEffect(() => {
    if (!credential) return undefined;
    refreshSession(); const timer = window.setInterval(refreshSession, 2000);
    return () => window.clearInterval(timer);
  }, [credential?.token, refreshSession]);

  const hostAction = async (path, method = "post", data) => {
    await api.request({ url: `/collab/sessions/${documentId}${path}`, method, data, headers: { Authorization: `Bearer ${credential.token}` } });
    await refreshSession();
  };

  const leave = () => { setCredential(null); setDocumentId(""); setPendingRequest(""); setSessionView(null); window.history.pushState(null, "", "/collab"); };
  const endSession = async () => { if (!confirm("End this session for everyone?")) return; await hostAction("", "delete"); leave(); };

  if (!identity) return <main className="collab-loading">Preparing your private guest identity…</main>;
  if (pendingRequest) return <main className="collab-loading"><div className="live-waiting"><ShieldCheck size={32} /><h2>Waiting for the host to let you in…</h2><p>Keep this window open. The request updates automatically.</p><button onClick={leave}>Cancel</button></div></main>;

  if (!credential) return (
    <main className="live-lobby">
      <section className="live-address-panel">
        <div className="live-lobby-title"><span><Radio size={20} /></span><div><small>TXTHERO LIVE</small><h1>Collaborate without sharing your filesystem</h1></div></div>
        <p>Only this collaborative document is shared. Guests never receive local paths, folders, or shell access.</p>
        <div className="live-create-settings">
          <label>Mode<select value={settings.mode} onChange={(e) => setSettings({ ...settings, mode: e.target.value })}><option value="team">Team</option><option value="1:1">1:1</option></select></label>
          <label>Expires<select value={settings.expires_in_minutes} onChange={(e) => setSettings({ ...settings, expires_in_minutes: Number(e.target.value) })}><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="480">8 hours</option></select></label>
          <label className="live-toggle"><input type="checkbox" checked={settings.require_approval} onChange={(e) => setSettings({ ...settings, require_approval: e.target.checked })} /> Require host approval</label>
        </div>
        <button className="live-primary" disabled={busy} onClick={createSession}><Users size={17} />{busy ? "Creating…" : "Create session"}</button>
      </section>
      <section className="live-connect-panel">
        <div><small>JOIN A SESSION</small><h2>Enter a 6-digit code</h2><p>No account is required. Your display name is scoped to this device.</p></div>
        <form onSubmit={joinSession}><Users size={18} /><input value={joinCode} onChange={(e) => { setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" placeholder="000000" aria-label="Session code" /><button disabled={busy}>Join <ArrowRight size={16} /></button></form>
        {error && <div className="live-join-error">{error}</div>}
      </section>
      <section className="live-recent-panel"><header><div><Clock3 size={16} /><strong>Recent sessions</strong></div><span>Codes only · stored on this device</span></header>{recent.length ? <div className="live-recent-list">{recent.map((item) => <button key={item.id} onClick={() => setJoinCode(item.id)}><span><FileText size={17} /></span><div><strong>{item.id.match(/.{1,3}/g)?.join(" ")}</strong><small>Enter to request access again</small></div><ArrowRight size={16} /></button>)}</div> : <div className="live-no-recent"><Clock3 size={22} /><span>Your recent session codes will appear here.</span></div>}</section>
      <Toaster position="bottom-right" />
    </main>
  );

  return (
    <main className="collab-shell">
      <TitleBar documentId={documentId} expiresAt={expiresAt} connection={collab} onLeave={leave} />
      {error && <div className="live-session-error">{error}</div>}
      <section className="collab-body">
        <aside><UserPresence users={collab.users} identity={identity} onRename={localIdentity.setDisplayName} session={sessionView} credential={credential} onApprove={(requestId, approved) => hostAction(`/requests/${requestId}/${approved ? "approve" : "reject"}`)} onRole={(id, role) => hostAction(`/participants/${id}`, "patch", { role })} onRemove={(id) => hostAction(`/participants/${id}`, "delete")} onEnd={endSession} /></aside>
        <div className="collab-workspace"><Editor documentId={documentId} session={collab} identity={identity} role={credential.role} /></div>
      </section>
      {collab.notice && <div className="collab-toast" key={collab.notice.id}>{collab.notice.text}</div>}
      <Toaster position="bottom-right" />
    </main>
  );
}
