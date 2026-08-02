"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { API_URL } from "../lib/api";

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || API_URL.replace(/^http/, "ws")).replace(/\/$/, "");

export function useCollab(documentId, identity, token) {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [synced, setSynced] = useState(false);
  const [notice, setNotice] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [latency, setLatency] = useState(null);
  const knownUsers = useRef(new Map());

  useEffect(() => {
    if (!identity || !documentId || !token) return undefined;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(`${WS_URL}/ws`, documentId, ydoc, {
      params: { user_id: identity.id, token },
      maxBackoffTime: 5000,
    });
    provider.awareness.setLocalStateField("user", identity);
    setSession({ ydoc, provider });

    const updateUsers = ({ added = [], removed = [] } = {}) => {
      const next = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (!state.user) return;
        const user = { ...state.user, status: state.activity?.status || "online", clientId };
        next.push(user);
        knownUsers.current.set(clientId, user);
      });
      setUsers(next);

      for (const clientId of added) {
        const user = knownUsers.current.get(clientId);
        if (user && user.id !== identity.id) setNotice({ id: Date.now(), text: `${user.name} joined` });
      }
      for (const clientId of removed) {
        const user = knownUsers.current.get(clientId);
        if (user && user.id !== identity.id) setNotice({ id: Date.now(), text: `${user.name} left` });
        knownUsers.current.delete(clientId);
      }
    };
    const onStatus = ({ status: nextStatus }) => setStatus(nextStatus);
    const onSync = (isSynced) => {
      setSynced(isSynced);
      if (isSynced) setLastSync(Date.now());
    };

    provider.on("status", onStatus);
    provider.on("sync", onSync);
    provider.awareness.on("change", updateUsers);
    updateUsers();
    const removeQuitListener = window.txthero?.onWillQuit?.(() => provider.disconnect());

    return () => {
      provider.awareness.off("change", updateUsers);
      provider.off("status", onStatus);
      provider.off("sync", onSync);
      provider.destroy();
      removeQuitListener?.();
      ydoc.destroy();
      knownUsers.current.clear();
      setSession(null);
      setUsers([]);
      setSynced(false);
    };
  }, [documentId, identity?.id, token]);

  useEffect(() => {
    if (session?.provider && identity) {
      session.provider.awareness.setLocalStateField("user", identity);
    }
  }, [identity, session]);

  useEffect(() => {
    if (!documentId) return undefined;
    let active = true;
    const measure = async () => {
      const started = performance.now();
      try {
        await fetch(`${API_URL}/health`, { cache: "no-store" });
        if (active) setLatency(Math.round(performance.now() - started));
      } catch { if (active) setLatency(null); }
    };
    measure();
    const timer = window.setInterval(measure, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [documentId]);

  return { ...session, awareness: session?.provider.awareness, connected: status === "connected", users, status, synced, lastSync, latency, notice };
}
